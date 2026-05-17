const express = require("express");
const router = express.Router();
const { z } = require("zod");
const backupController = require("../controllers/backupController");
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/rbac");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");

const paginationQuery = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(200).optional(),
  })
  .passthrough();

const runBody = z
  .object({
    type: z.enum(["manual", "scheduled"]).optional(),
  })
  .passthrough();

const fileParams = z.object({ fileName: z.string().min(1) });

const deleteBody = z
  .object({
    confirm: z.string().min(1),
  })
  .passthrough();

const restoreBody = z
  .object({
    fileName: z.string().min(1),
    confirmText: z.string().min(1),
  })
  .passthrough();

// Legacy endpoints (kept)
router.get(
  "/",
  authMiddleware,
  requirePermission("BACKUPS_VIEW"),
  asyncHandler(backupController.getBackups)
);
router.post(
  "/trigger",
  authMiddleware,
  requirePermission("BACKUPS_RUN"),
  asyncHandler(backupController.triggerBackup)
);

// Frontend expected endpoints
router.get(
  "/summary",
  authMiddleware,
  requirePermission("BACKUPS_VIEW"),
  asyncHandler(backupController.getBackupSummary)
);
router.get(
  "/files",
  authMiddleware,
  requirePermission("BACKUPS_VIEW"),
  validate({ query: paginationQuery }),
  asyncHandler(backupController.getBackupFiles)
);
router.post(
  "/run",
  authMiddleware,
  requirePermission("BACKUPS_RUN"),
  validate({ body: runBody }),
  asyncHandler(backupController.runBackup)
);
router.delete(
  "/files/:fileName",
  authMiddleware,
  requirePermission("BACKUPS_DELETE"),
  validate({ params: fileParams, body: deleteBody }),
  asyncHandler(backupController.deleteBackupFile)
);
router.get(
  "/files/:fileName/download",
  authMiddleware,
  requirePermission("BACKUPS_VIEW"),
  validate({ params: fileParams }),
  asyncHandler(backupController.downloadBackupFile)
);
router.post(
  "/restore",
  authMiddleware,
  requirePermission("BACKUPS_RESTORE"),
  validate({ body: restoreBody }),
  asyncHandler(backupController.restoreBackup)
);

module.exports = router;
