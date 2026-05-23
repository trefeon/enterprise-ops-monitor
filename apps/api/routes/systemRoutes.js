const express = require("express");
const router = express.Router();
const { z } = require("zod");
const systemController = require("../controllers/systemController");
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission, requireNotDemo } = require("../middleware/rbac");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");

const paginationQuery = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(200).optional(),
    q: z.string().optional(),
    level: z.enum(["INFO", "WARNING", "ERROR", "CRITICAL"]).optional(),
  })
  .passthrough();

const exportLogsQuery = z
  .object({
    q: z.string().optional(),
    level: z.enum(["INFO", "WARNING", "ERROR", "CRITICAL"]).optional(),
    limit: z.coerce.number().int().positive().max(10000).optional(),
  })
  .passthrough();

const restartParams = z.object({ service: z.string().min(1).max(64) });
const emptyQuery = z.object({}).passthrough();
const emptyBody = z.object({}).passthrough().optional().default({});

const confirmBody = z
  .object({
    confirm: z.boolean(),
  })
  .passthrough();

router.get(
  "/overview",
  authMiddleware,
  requirePermission("SYSTEM_VIEW"),
  validate({ query: emptyQuery }),
  asyncHandler(systemController.getSystemOverview)
);
router.get(
  "/branches",
  authMiddleware,
  requirePermission("SYSTEM_VIEW"),
  validate({ query: emptyQuery }),
  asyncHandler(systemController.getSystemBranches)
);
router.get(
  "/services",
  authMiddleware,
  requirePermission("SYSTEM_VIEW"),
  validate({ query: emptyQuery }),
  asyncHandler(systemController.getSystemServices)
);
router.get(
  "/logs",
  authMiddleware,
  requirePermission("SYSTEM_VIEW"),
  validate({ query: paginationQuery }),
  asyncHandler(systemController.getSystemLogs)
);
router.get(
  "/logs/export",
  authMiddleware,
  requirePermission("SYSTEM_VIEW"),
  requireNotDemo(),
  validate({ query: exportLogsQuery }),
  asyncHandler(systemController.exportSystemLogs)
);
router.get(
  "/health",
  authMiddleware,
  requirePermission("SYSTEM_VIEW"),
  validate({ query: emptyQuery }),
  asyncHandler(systemController.getSystemHealth)
);
router.post(
  "/healthcheck",
  authMiddleware,
  requirePermission("SYSTEM_HEALTHCHECK"),
  requireNotDemo(),
  validate({ body: emptyBody }),
  asyncHandler(systemController.runHealthcheck)
);
router.post(
  "/services/:service/restart",
  authMiddleware,
  requirePermission("SYSTEM_RESTART"),
  validate({ params: restartParams, body: confirmBody }),
  asyncHandler(systemController.restartService)
);

module.exports = router;
