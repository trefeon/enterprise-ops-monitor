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
    const orgId = req.params.orgId || req.body.orgId || req.authz?.orgId;

    if (!orgId) {
      return fail(res, 400, "VALIDATION_ERROR", "orgId is required");
    }

    // Server‑side validation
    const validation = validateUpload(mimetype, size);
    if (!validation.valid) {
      return fail(res, 400, "VALIDATION_ERROR", validation.message);
    }

    // Read temp file into buffer
    const fs = require("node:fs");
    const buffer = fs.readFileSync(tmpPath);

    // Store via service
    const { storagePath, filename } = await mediaService.upload(
      orgId,
      buffer,
      mimetype,
      originalname
    );

    // Clean up temp file
    try {
      fs.unlinkSync(tmpPath);
    } catch (_) {
      // non‑fatal
    }

    // Save to database
    const asset = await db.MediaAsset.create({
      org_id: orgId,
      uploaded_by: req.user?.id || null,
      filename,
      original_name: originalname,
      mime_type: mimetype,
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
