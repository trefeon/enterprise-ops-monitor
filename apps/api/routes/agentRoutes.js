const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { z } = require("zod");
const agentController = require("../controllers/agentController");
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission, requireNotDemo } = require("../middleware/rbac");
const { Permissions } = require("../lib/permissions");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");

const DEFAULT_AGENT_UPDATE_DIR = path.resolve(__dirname, "../../../agent_updates");
const configuredAgentUpdateDir = String(process.env.AGENT_UPDATE_DIR || "").trim();
let uploadAgentUpdateDir = configuredAgentUpdateDir || DEFAULT_AGENT_UPDATE_DIR;

function ensureUploadDirReady(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}

if (!ensureUploadDirReady(uploadAgentUpdateDir)) {
  if (
    uploadAgentUpdateDir !== DEFAULT_AGENT_UPDATE_DIR &&
    ensureUploadDirReady(DEFAULT_AGENT_UPDATE_DIR)
  ) {
    console.warn(
      `[agentRoutes] AGENT_UPDATE_DIR '${uploadAgentUpdateDir}' unavailable; using '${DEFAULT_AGENT_UPDATE_DIR}'`
    );
    uploadAgentUpdateDir = DEFAULT_AGENT_UPDATE_DIR;
  }
}

// Storage for Publisher upload
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadAgentUpdateDir);
  },
  filename: (_req, _file, cb) => {
    // We always save as DemoAgentPublisher.exe to overwrite the old one
    cb(null, "DemoAgentPublisher.exe");
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (_req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === ".exe") {
      cb(null, true);
    } else {
      cb(new Error("Only .exe files are allowed!"));
    }
  },
});

const versionQuery = z
  .object({
    id: z.string().optional(),
    host: z.string().optional(),
    ver: z.string().optional(),
    status: z.enum(["ok", "error"]).optional(),
    msg: z.string().optional(),
    worker_ver: z.string().optional(),
    agent_status: z
      .enum([
        "unknown",
        "checking",
        "online",
        "downloading",
        "updating",
        "up_to_date",
        "error",
        "waiting",
        "need_update",
      ])
      .optional(),
  })
  .passthrough();

const monitoringQuery = z
  .object({
    areaId: z.string().optional(),
    region: z.string().optional(),
    q: z.string().optional(),
  })
  .passthrough();
const downloadQuery = z.object({}).passthrough();

const uploadBody = z
  .object({
    version: z.string().min(1, "Version string is required"),
  })
  .passthrough();

const deleteParams = z.object({
  store_id: z.string().min(1),
});

// Public endpoints (for agents / .bat scripts)
router.get("/version", validate({ query: versionQuery }), agentController.getAgentVersion);
router.get("/version.txt", validate({ query: versionQuery }), agentController.getAgentVersion);
router.get("/publisher", validate({ query: downloadQuery }), agentController.downloadPublisher);
router.get(
  "/DemoAgentPublisher.exe",
  validate({ query: downloadQuery }),
  agentController.downloadPublisher
);
router.get(
  "/setup-script",
  validate({ query: downloadQuery }),
  agentController.downloadSetupScript
);

// Secure endpoints (for admin dashboard)
router.use(authMiddleware);

router.get(
  "/monitoring/export",
  requirePermission(Permissions.AGENT_UPDATE),
  requireNotDemo(),
  validate({ query: monitoringQuery }),
  asyncHandler(agentController.exportAgentReport)
);

router.get(
  "/monitoring",
  requirePermission(Permissions.AGENT_UPDATE),
  validate({ query: monitoringQuery }),
  asyncHandler(agentController.getMonitoringData)
);

router.get(
  "/suggest-version",
  requirePermission(Permissions.AGENT_UPDATE),
  validate({ query: downloadQuery }),
  asyncHandler(agentController.suggestVersion)
);

router.post(
  "/upload",
  requirePermission(Permissions.AGENT_UPDATE),
  requireNotDemo(),
  upload.single("publisher"),
  validate({ body: uploadBody }),
  asyncHandler(agentController.uploadPublisher)
);

router.delete(
  "/monitoring/:store_id",
  requirePermission(Permissions.AGENT_UPDATE),
  requireNotDemo(),
  validate({ params: deleteParams }),
  asyncHandler(agentController.deleteAgentData)
);

module.exports = router;
