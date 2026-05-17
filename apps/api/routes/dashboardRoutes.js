const express = require("express");
const router = express.Router();
const { z } = require("zod");
const dashboardController = require("../controllers/dashboardController");
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/rbac");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");

const alertsQuery = z
  .object({
    limit: z.coerce.number().int().positive().max(50).optional(),
  })
  .passthrough();

router.get(
  "/summary",
  authMiddleware,
  requirePermission("DASHBOARD_VIEW"),
  asyncHandler(dashboardController.getDashboardSummary)
);
router.get(
  "/overview",
  authMiddleware,
  requirePermission("DASHBOARD_VIEW"),
  asyncHandler(dashboardController.getDashboardSummary)
);
router.post(
  "/sync",
  authMiddleware,
  requirePermission("DASHBOARD_VIEW"),
  asyncHandler(dashboardController.syncDashboard)
);
router.get(
  "/alerts",
  authMiddleware,
  requirePermission("DASHBOARD_VIEW"),
  validate({ query: alertsQuery }),
  asyncHandler(dashboardController.getDashboardAlerts)
);

module.exports = router;
