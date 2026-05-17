const express = require("express");
const router = express.Router();
const { z } = require("zod");
const storeController = require("../controllers/storeController");
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/rbac");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");

const idParams = z.object({ id: z.string().regex(/^\d+$/, "id must be numeric") });
const listQuery = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(200).optional(),
    q: z.string().optional(),
    areaId: z.string().optional(),
    branchId: z.string().optional(),
    status: z.enum(["active", "inactive"]).optional(),
    region: z.string().optional(),
  })
  .passthrough();

const updateBody = z
  .object({
    store_name: z.string().min(1).optional(),
    area: z.string().optional(),
    region: z.string().optional(),
    address: z.string().optional(),
    pic_name: z.string().optional(),
    contact_number: z.string().optional(),
    is_active: z.union([z.boolean(), z.string()]).optional(),
  })
  .strict();

// GET /api/stores/regions - Get unique regions
router.get(
  "/regions",
  authMiddleware,
  requirePermission("STORES_VIEW", { scope: "branch", branchFrom: "query" }),
  asyncHandler(storeController.getRegions)
);

// GET /api/stores - List stores with branch scope filtering
router.get(
  "/",
  authMiddleware,
  requirePermission("STORES_VIEW", { scope: "branch", branchFrom: "query" }),
  validate({ query: listQuery }),
  asyncHandler(storeController.getAllStores)
);

// GET /api/stores/export - Export stores
router.get(
  "/export",
  authMiddleware,
  requirePermission("STORES_VIEW", { scope: "branch", branchFrom: "query" }),
  validate({ query: listQuery }),
  asyncHandler(storeController.exportStores)
);

// GET /api/stores/:id - Get store by ID with branch scope check
router.get(
  "/:id",
  authMiddleware,
  requirePermission("STORES_VIEW", { scope: "branch", branchFrom: "auto", storeLookup: true }),
  validate({ params: idParams }),
  asyncHandler(storeController.getStoreById)
);

// PUT /api/stores/:id - Update store with branch scope check
router.put(
  "/:id",
  authMiddleware,
  requirePermission("STORES_EDIT", { scope: "branch", branchFrom: "auto", storeLookup: true }),
  validate({ params: idParams, body: updateBody }),
  asyncHandler(storeController.updateStore)
);

module.exports = router;
