const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("node:path");
const { z } = require("zod");
const { ok, fail } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/rbac");
const validate = require("../middleware/validate");
const db = require("../models");
const mediaService = require("../services/mediaService");
const { detectMimeFromBuffer } = require("../utils/magicMime");

// ---------------------------------------------------------------------------
// Multer config — store incoming files to a temp uploads/ dir
// ---------------------------------------------------------------------------
const uploadsDir = path.resolve(__dirname, "..", "uploads");
const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadsDir);
  },
  filename(_req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || "";
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB global limit
  // FIRST-PASS gate only: file.mimetype is client-controlled and untrusted.
  // The authoritative check is the magic-byte sniff (detectMimeFromBuffer)
  // performed after the file is read in the upload handler below.
  fileFilter(_req, file, cb) {
    const allowedImages = ["image/jpeg", "image/png", "image/webp"];
    const allowedVideos = ["video/mp4", "video/webm"];
    const allowed = [...allowedImages, ...allowedVideos];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// ---------------------------------------------------------------------------
// Server‑side upload validation helpers
// ---------------------------------------------------------------------------
const IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const VIDEO_MAX_BYTES = 200 * 1024 * 1024; // 200 MB

function validateUpload(mimetype, size) {
  const isImage = ["image/jpeg", "image/png", "image/webp"].includes(mimetype);
  const isVideo = ["video/mp4", "video/webm"].includes(mimetype);

  if (!isImage && !isVideo) {
    return { valid: false, message: `Unsupported file type: ${mimetype}` };
  }

  if (isImage && size > IMAGE_MAX_BYTES) {
    return { valid: false, message: "Image exceeds 10 MB limit" };
  }

  if (isVideo && size > VIDEO_MAX_BYTES) {
    return { valid: false, message: "Video exceeds 200 MB limit" };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Params schema for DELETE /:id
// ---------------------------------------------------------------------------
const idParams = z.object({
  id: z.string().uuid("Invalid media asset ID"),
});

// ---------------------------------------------------------------------------
// Params schema for GET /:orgId/:filename (public display route, hardened)
//
// The route stays public per ADR-4, so the inputs are the only defense before
// resolvePath. orgId must be a UUID and filename must be a bare basename with
// an allowlisted extension mirroring mediaService._extFromMime().
// ---------------------------------------------------------------------------
const getMediaParams = z.object({
  orgId: z.string().uuid("Invalid organization ID"),
  filename: z
    .string("Invalid filename")
    .min(1, "Invalid filename")
    .max(255, "Invalid filename")
    // Basename only: no path separators (raw or encoded), no dotfiles.
    .regex(/^[^/\\]+$/, "Invalid filename")
    .refine((value) => !value.startsWith("."), "Invalid filename")
    // Reject `..` outright — storage filenames are always `{uuid}.{ext}`.
    .refine((value) => !value.includes(".."), "Invalid filename")
    // Defense in depth: reject encoded separators in case a proxy forwards
    // the raw segment without percent-decoding.
    .refine((value) => !/%2f|%5c/i.test(value), "Invalid filename")
    // Allowlist must mirror mediaService._extFromMime.
    .refine((value) => /\.(jpe?g|png|webp|mp4|webm)$/i.test(value), "Unsupported file type"),
});

// ---------------------------------------------------------------------------
// POST /api/media/upload  —  Upload a media file (auth required)
// ---------------------------------------------------------------------------
router.post(
  "/upload",
  authMiddleware,
  requirePermission("MEDIA_EDIT", { scope: "branch", branchFrom: "body" }),
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return fail(res, 400, "UPLOAD_ERROR", err.message);
        }
        return fail(res, 400, "UPLOAD_ERROR", err.message);
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return fail(res, 400, "VALIDATION_ERROR", "No file provided");
    }

    const { mimetype, size, originalname, path: tmpPath } = req.file;

    // ADR-3: orgId comes from authenticated context ONLY — the tenant
    // middleware result (req.tenantId) or the JWT claim (req.user.orgId).
    // Client-supplied orgId (params/body/authz) is never the source of truth.
    const orgId = req.tenantId || req.user?.orgId || null;

    if (!orgId) {
      return fail(
        res,
        400,
        "VALIDATION_ERROR",
        "Cannot determine organization: upload requires an org-scoped endpoint or an account with an organization"
      );
    }

    // The org id is stored against the media_assets.org_id UUID FK and used in
    // the on-disk path — reject anything that is not a UUID before fs access.
    if (!z.string().uuid().safeParse(orgId).success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid organization ID");
    }

    // ADR-3 cross-check: if the client supplied an orgId anywhere, it must
    // match the derived org — reject mismatches before any filesystem work.
    const claimedOrgId = req.params.orgId || req.body.orgId || req.authz?.orgId || null;
    if (claimedOrgId && claimedOrgId !== orgId) {
      return fail(res, 403, "TENANT_MISMATCH", "Organization mismatch");
    }

    // Read temp file into buffer (needed for the magic-byte sniff — the
    // client-declared mimetype is only a first-pass gate).
    const fs = require("node:fs");
    const buffer = fs.readFileSync(tmpPath);

    // Magic-byte verification (issue #14): the declared MIME type must match
    // the file's actual content, or the upload is rejected.
    const detected = detectMimeFromBuffer(buffer);
    if (!detected || detected !== mimetype) {
      return fail(res, 400, "UPLOAD_ERROR", "File content does not match its declared type");
    }

    // Server-side validation against the DETECTED (content-derived) type, so
    // size limits apply to the real file type — not the client's claim.
    const validation = validateUpload(detected, size);
    if (!validation.valid) {
      return fail(res, 400, "VALIDATION_ERROR", validation.message);
    }

    // Store via service — the detected MIME type is authoritative.
    const { storagePath, filename } = await mediaService.upload(
      orgId,
      buffer,
      detected,
      originalname
    );

    // Clean up temp file
    try {
      fs.unlinkSync(tmpPath);
    } catch (_) {
      // non‑fatal
    }

    // Save to database
    // Note: env_admin is a synthetic non-UUID id that cannot satisfy the
    // media_assets.uploaded_by FK — store NULL for it.
    const uploadedBy = req.user?.id === "env_admin" ? null : req.user?.id || null;
    const asset = await db.MediaAsset.create({
      org_id: orgId,
      uploaded_by: uploadedBy,
      filename,
      original_name: originalname,
      mime_type: detected,
      file_size_bytes: size,
      storage_path: storagePath,
    });

    return ok(res, { asset }, null, 201);
  })
);

// ---------------------------------------------------------------------------
// GET /api/media/:orgId/:filename  —  Serve stored file (no auth, for display clients)
// ---------------------------------------------------------------------------
router.get(
  "/:orgId/:filename",
  validate({ params: getMediaParams }),
  asyncHandler(async (req, res) => {
    const { orgId, filename } = req.params;
    const relativePath = `${orgId}/assets/${filename}`;
    const fullPath = mediaService.resolvePath(relativePath);

    if (!fullPath) {
      return fail(res, 404, "NOT_FOUND", "File not found");
    }

    try {
      await require("node:fs/promises").access(fullPath);
    } catch {
      return fail(res, 404, "NOT_FOUND", "File not found");
    }

    const mime = require("mime-types").lookup(filename) || "application/octet-stream";
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "public, max-age=86400");

    const stream = require("node:fs").createReadStream(fullPath);
    stream.pipe(res);
    stream.on("error", () => {
      if (!res.headersSent) {
        return fail(res, 500, "STREAM_ERROR", "Failed to stream file");
      }
      res.end();
    });
  })
);

// ---------------------------------------------------------------------------
// DELETE /api/media/:id  —  Delete a media asset (auth + MEDIA_EDIT required)
// ---------------------------------------------------------------------------
router.delete(
  "/:id",
  authMiddleware,
  requirePermission("MEDIA_EDIT"),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const asset = await db.MediaAsset.findByPk(req.params.id);
    if (!asset) {
      return fail(res, 404, "NOT_FOUND", "Media asset not found");
    }

    // Delete from disk
    if (asset.storage_path) {
      await mediaService.delete(asset.storage_path);
    }
    if (asset.thumb_path) {
      await mediaService.delete(asset.thumb_path);
    }

    await asset.destroy();

    return ok(res, { deleted: true });
  })
);

module.exports = router;
/* route: mediaRoutes */
