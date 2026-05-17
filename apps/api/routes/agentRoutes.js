const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const agentController = require("../controllers/agentController");
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission, requireNotDemo } = require("../middleware/rbac");
const { Permissions } = require("../lib/permissions");

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

// Public endpoints (for agents / .bat scripts)
router.get("/version", agentController.getAgentVersion);
router.get("/version.txt", agentController.getAgentVersion); // Alias for compatibility
router.get("/publisher", agentController.downloadPublisher);
router.get("/DemoAgentPublisher.exe", agentController.downloadPublisher); // Alias
router.get("/setup-script", agentController.downloadSetupScript);

// Secure endpoints (for admin dashboard)
router.use(authMiddleware);

router.get(
  "/monitoring/export",
  requirePermission(Permissions.AGENT_UPDATE),
  requireNotDemo(),
  agentController.exportAgentReport
);

router.get(
  "/monitoring",
  requirePermission(Permissions.AGENT_UPDATE),
  agentController.getMonitoringData
);

router.get(
  "/suggest-version",
  requirePermission(Permissions.AGENT_UPDATE),
  agentController.suggestVersion
);

router.post(
  "/upload",
  requirePermission(Permissions.AGENT_UPDATE),
  requireNotDemo(),
  upload.single("publisher"),
  agentController.uploadPublisher
);

router.delete(
  "/monitoring/:store_id",
  requirePermission(Permissions.AGENT_UPDATE),
  requireNotDemo(),
  agentController.deleteAgentData
);

module.exports = router;
