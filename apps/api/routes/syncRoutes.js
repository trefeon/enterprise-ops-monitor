const express = require("express");
const router = express.Router();
const { z } = require("zod");
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission, requireNotDemo } = require("../middleware/rbac");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const {
  getSyncStatus,
  getSyncSummary,
  getSyncStores,
  getSyncStoreDetail,
  getSyncHistory,
  getSyncHistorySummary,
  refreshSync,
  getLiveSyncDashboard,
} = require("../controllers/syncController");

const storesQuery = z
  .object({
    branch: z.string().optional(),
    branchId: z.string().optional(),
    staleOnly: z.enum(["true", "false", "1", "0"]).optional(),
    status: z.string().optional(),
    search: z.string().optional(),
    excludeBazar: z.enum(["true", "false", "1", "0"]).optional(),
    sort: z.enum(["ageDesc", "ageAsc", "default"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(100).optional(),
    limit: z.coerce.number().int().positive().max(500).optional(),
  })
  .passthrough();

const historyParams = z.object({ storeCode: z.string().min(1) });
const historyQuery = z
  .object({
    minutes: z.coerce.number().int().positive().max(30).optional(),
  })
  .passthrough();
const historySummaryQuery = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    bucketMinutes: z.coerce.number().int().optional(),
  })
  .passthrough();

// --- Public routes (no auth) ---
// GET /api/sync/live - TV dashboard endpoint (public, read-only)
router.get("/live", asyncHandler(getLiveSyncDashboard));

// All remaining routes require authentication
router.use(authMiddleware);

// GET /api/sync/status - Overall sync health summary (with branch scope)
router.get(
  "/status",
  requirePermission("SYNC_VIEW", { scope: "branch", branchFrom: "query" }),
  asyncHandler(getSyncStatus)
);

// GET /api/sync/summary - KPI + branch health (with branch scope)
router.get(
  "/summary",
  requirePermission("SYNC_VIEW", { scope: "branch", branchFrom: "query" }),
  asyncHandler(getSyncSummary)
);

// GET /api/sync/stores - Paginated store sync list (with branch scope)
router.get(
  "/stores",
  requirePermission("SYNC_VIEW", { scope: "branch", branchFrom: "query" }),
  validate({ query: storesQuery }),
  asyncHandler(getSyncStores)
);

// GET /api/sync/stores/:kodetoko - Store detail (with branch scope via lookup)
router.get(
  "/stores/:kodetoko",
  requirePermission("SYNC_VIEW", { scope: "branch", branchFrom: "auto", storeLookup: true }),
  asyncHandler(getSyncStoreDetail)
);

// GET /api/sync/history/:storeCode - Historical sync records (with branch scope via lookup)
router.get(
  "/history/:storeCode",
  requirePermission("SYNC_VIEW", { scope: "branch", branchFrom: "auto", storeLookup: true }),
  validate({ params: historyParams, query: historyQuery }),
  asyncHandler(getSyncHistory)
);

// GET /api/sync/history/:storeCode/summary - Daily bucketed history (with branch scope via lookup)
router.get(
  "/history/:storeCode/summary",
  requirePermission("SYNC_VIEW", { scope: "branch", branchFrom: "auto", storeLookup: true }),
  validate({ params: historyParams, query: historySummaryQuery }),
  asyncHandler(getSyncHistorySummary)
);

// POST /api/sync/refresh - Force cache refresh
router.post("/refresh", requirePermission("SYNC_VIEW"), requireNotDemo(), asyncHandler(refreshSync));

module.exports = router;
