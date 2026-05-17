const express = require("express");
const router = express.Router();
const { z } = require("zod");
const eodController = require("../controllers/eodController");
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission, requireAllBranchScope } = require("../middleware/rbac");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");

// --- Public routes (no auth) ---
// GET /api/eod/live - TV dashboard EOD failure ranking (public, read-only)
router.get("/live", asyncHandler(eodController.getLiveEodRanking));

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");

const listQuery = z
  .object({
    date: dateStr.optional(),
    areaId: z.string().optional(),
    area: z.string().optional(),
    status: z.enum(["done", "pending", "failed"]).optional(),
    q: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(200).optional(),
  })
  .passthrough();

const storeCodeParams = z.object({ storeCode: z.string().min(1) });

const syncBody = z
  .object({
    date: dateStr.optional(),
    scope: z.enum(["all"]).optional(),
    storeCode: z.string().optional(),
    store_code: z.string().optional(),
  })
  .passthrough();

const retryBody = z
  .object({
    storeCode: z.string().min(1),
    date: dateStr.optional(),
  })
  .passthrough();

const summaryQuery = z
  .object({
    date: dateStr.optional(),
  })
  .passthrough();

const lateQuery = z
  .object({
    date: dateStr.optional(),
    branchId: z.string().optional(),
  })
  .passthrough();

const historyQuery = z
  .object({
    storeCode: z.string().min(1),
    from: dateStr.optional(),
    to: dateStr.optional(),
  })
  .passthrough();

const exportQuery = z
  .object({
    date: dateStr.optional(),
    branchId: z.string().optional(),
  })
  .passthrough();

const retryBatchBody = z
  .object({
    date: dateStr.optional(),
    storeCodes: z.array(z.string().min(1)).optional(),
    stores: z
      .array(
        z.object({
          storeCode: z.string().min(1),
          date: dateStr.optional(),
        })
      )
      .optional(),
  })
  .passthrough();

const trendQuery = z
  .object({
    days: z.coerce.number().int().positive().max(30).optional(),
  })
  .passthrough();

router.get(
  "/stores",
  authMiddleware,
  requirePermission("EOD_VIEW"),
  validate({ query: listQuery }),
  asyncHandler(eodController.getEODStores)
);
router.get(
  "/stores/:storeCode",
  authMiddleware,
  requirePermission("EOD_VIEW"),
  validate({
    params: storeCodeParams,
    query: z.object({ date: dateStr.optional() }).passthrough(),
  }),
  asyncHandler(eodController.getEODStoreDetail)
);
router.get(
  "/areas",
  authMiddleware,
  requirePermission("EOD_VIEW"),
  validate({ query: z.object({ date: dateStr.optional() }).passthrough() }),
  asyncHandler(eodController.getEODAreas)
);
router.get(
  "/summary-by-branch",
  authMiddleware,
  requirePermission("EOD_VIEW"),
  validate({ query: summaryQuery }),
  asyncHandler(eodController.getEODSummaryByBranch)
);

// Menu aliases
router.get(
  "/summary",
  authMiddleware,
  requirePermission("EOD_VIEW"),
  validate({ query: summaryQuery }),
  asyncHandler(eodController.getEODSummaryByBranch)
);
router.get(
  "/branches",
  authMiddleware,
  requirePermission("EOD_VIEW"),
  validate({ query: z.object({ date: dateStr.optional() }).passthrough() }),
  asyncHandler(eodController.getEODAreas)
);
router.get(
  "/late-stores",
  authMiddleware,
  requirePermission("EOD_VIEW"),
  validate({ query: lateQuery }),
  asyncHandler(eodController.getLateEodStores)
);
router.get(
  "/history",
  authMiddleware,
  requirePermission("EOD_VIEW"),
  validate({ query: historyQuery }),
  asyncHandler(eodController.getEODHistoryByStore)
);
router.get(
  "/export",
  authMiddleware,
  requirePermission("EOD_VIEW"),
  validate({ query: exportQuery }),
  asyncHandler(eodController.exportEod)
);
router.get(
  "/trend",
  authMiddleware,
  requirePermission("EOD_VIEW"),
  validate({ query: trendQuery }),
  asyncHandler(eodController.getEODTrend)
);

// Backward-compatible
router.get(
  "/",
  authMiddleware,
  requirePermission("EOD_VIEW"),
  validate({ query: listQuery }),
  asyncHandler(eodController.getEODMonitor)
);
router.get(
  "/area",
  authMiddleware,
  requirePermission("EOD_VIEW"),
  validate({ query: z.object({ date: dateStr.optional() }).passthrough() }),
  asyncHandler(eodController.getEODByArea)
);

router.post(
  "/sync",
  authMiddleware,
  requirePermission("EOD_SYNC"),
  requireAllBranchScope(),
  validate({ body: syncBody }),
  asyncHandler(eodController.manualSync)
);
router.post(
  "/retry",
  authMiddleware,
  requirePermission("EOD_RETRY"),
  validate({ body: retryBody }),
  asyncHandler(eodController.retryEOD)
);
router.post(
  "/retry-batch",
  authMiddleware,
  requirePermission("EOD_RETRY"),
  validate({ body: retryBatchBody }),
  asyncHandler(eodController.retryEodBatch)
);

module.exports = router;
