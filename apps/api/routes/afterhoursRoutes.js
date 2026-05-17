const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission, requireNotDemo, requireAllBranchScope } = require("../middleware/rbac");
const asyncHandler = require("../utils/asyncHandler");
const {
  listViolations,
  getSummary,
  getAvailableDates,
  triggerCheck,
  getSettings,
  saveSettings,
  getMonthlyReport,
  exportMonthlyReport,
  getReportMonths,
  triggerReportGenerate,
} = require("../controllers/afterhoursController");

// All routes require authentication
router.use(authMiddleware);

// GET /api/afterhours - List violations (filterable)
router.get("/", requirePermission("AFTERHOURS_VIEW"), asyncHandler(listViolations));

// GET /api/afterhours/summary - Aggregated stats per branch
router.get("/summary", requirePermission("AFTERHOURS_VIEW"), asyncHandler(getSummary));

// GET /api/afterhours/dates - Available check dates
router.get("/dates", requirePermission("AFTERHOURS_VIEW"), asyncHandler(getAvailableDates));

// POST /api/afterhours/check - Manual trigger
router.post(
  "/check",
  requirePermission("AFTERHOURS_VIEW"),
  requireNotDemo(),
  requireAllBranchScope(),
  asyncHandler(triggerCheck)
);

// GET /api/afterhours/settings - Load notification config
router.get(
  "/settings",
  requirePermission("AFTERHOURS_VIEW"),
  requireAllBranchScope(),
  asyncHandler(getSettings)
);

// PUT /api/afterhours/settings - Save notification config
router.put(
  "/settings",
  requirePermission("AFTERHOURS_VIEW"),
  requireNotDemo(),
  requireAllBranchScope(),
  asyncHandler(saveSettings)
);

// --- Monthly Report ---
// GET /api/afterhours/report - Monthly ranking (filterable)
router.get("/report", requirePermission("AFTERHOURS_VIEW"), asyncHandler(getMonthlyReport));

// GET /api/afterhours/report/export - Download Excel/WPS-friendly monthly export
router.get(
  "/report/export",
  requirePermission("AFTERHOURS_VIEW"),
  asyncHandler(exportMonthlyReport)
);

// GET /api/afterhours/report/months - Available report months
router.get("/report/months", requirePermission("AFTERHOURS_VIEW"), asyncHandler(getReportMonths));

// POST /api/afterhours/report/generate - Manual trigger report generation
router.post(
  "/report/generate",
  requirePermission("AFTERHOURS_VIEW"),
  requireNotDemo(),
  requireAllBranchScope(),
  asyncHandler(triggerReportGenerate)
);

module.exports = router;
