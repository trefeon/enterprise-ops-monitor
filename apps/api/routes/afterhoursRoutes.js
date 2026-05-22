const express = require("express");
const { z } = require("zod");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission, requireNotDemo, requireAllBranchScope } = require("../middleware/rbac");
const validate = require("../middleware/validate");
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

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");

const violationsQuery = z
  .object({
    date: dateStr.optional(),
    branch: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(100).optional(),
  })
  .passthrough();

const summaryQuery = z
  .object({
    date: dateStr.optional(),
    branch: z.string().optional(),
  })
  .passthrough();

const datesQuery = z
  .object({
    limit: z.coerce.number().int().positive().max(90).optional(),
  })
  .passthrough();

const triggerBody = z
  .object({
    runAllStages: z.union([z.boolean(), z.string()]).optional(),
    stageDelayMs: z.coerce.number().int().min(0).max(10000).optional(),
  })
  .passthrough();

const settingsBody = z.object({}).passthrough();

const reportQuery = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM")
      .optional(),
    branch: z.string().optional(),
    search: z.string().optional(),
    limit: z.coerce.number().int().positive().max(1000).optional(),
  })
  .passthrough();

const exportReportQuery = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM")
      .optional(),
    branch: z.string().optional(),
    search: z.string().optional(),
  })
  .passthrough();

const generateBody = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM")
      .optional(),
  })
  .passthrough();

// All routes require authentication
router.use(authMiddleware);

// GET /api/afterhours - List violations (filterable)
router.get(
  "/",
  requirePermission("AFTERHOURS_VIEW"),
  validate({ query: violationsQuery }),
  asyncHandler(listViolations)
);

// GET /api/afterhours/summary - Aggregated stats per branch
router.get(
  "/summary",
  requirePermission("AFTERHOURS_VIEW"),
  validate({ query: summaryQuery }),
  asyncHandler(getSummary)
);

// GET /api/afterhours/dates - Available check dates
router.get(
  "/dates",
  requirePermission("AFTERHOURS_VIEW"),
  validate({ query: datesQuery }),
  asyncHandler(getAvailableDates)
);

// POST /api/afterhours/check - Manual trigger
router.post(
  "/check",
  requirePermission("AFTERHOURS_VIEW"),
  requireNotDemo(),
  requireAllBranchScope(),
  validate({ body: triggerBody }),
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
  validate({ body: settingsBody }),
  asyncHandler(saveSettings)
);

// --- Monthly Report ---

// GET /api/afterhours/report - Monthly ranking (filterable)
router.get(
  "/report",
  requirePermission("AFTERHOURS_VIEW"),
  validate({ query: reportQuery }),
  asyncHandler(getMonthlyReport)
);

// GET /api/afterhours/report/export - Download Excel/WPS-friendly monthly export
router.get(
  "/report/export",
  requirePermission("AFTERHOURS_VIEW"),
  validate({ query: exportReportQuery }),
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
  validate({ body: generateBody }),
  asyncHandler(triggerReportGenerate)
);

module.exports = router;
