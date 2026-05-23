const express = require("express");
const router = express.Router();
const { z } = require("zod");
const storeController = require("../controllers/storeController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireNotDemo, requirePermission } = require("../middleware/rbac");
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
    storeCode: z.string().min(1).optional(),
    storeName: z.string().min(1).optional(),
    branchId: z.union([z.string(), z.number()]).optional(),
    areaId: z.union([z.string(), z.number()]).optional(),
    region: z.string().optional(),
    picName: z.string().optional(),
    phone: z.string().optional(),
    contactNumber: z.string().optional(),
    isActive: z.boolean().optional(),
    store_code: z.union([z.string(), z.number()]).optional(),
    store_name: z.string().min(1).optional(),
    branch_id: z.union([z.string(), z.number()]).optional(),
    area: z.string().optional(),
    address: z.string().optional(),
    pic_name: z.string().optional(),
    contact_number: z.string().optional(),
    is_active: z.union([z.boolean(), z.string()]).optional(),
  })
  .strict();

const createBody = updateBody.superRefine((value, ctx) => {
  if (!(value.storeCode || value.store_code)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["storeCode"],
      message: "Store code is required",
    });
  }
  if (!(value.storeName || value.store_name)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["storeName"],
      message: "Store name is required",
    });
  }
  if (!(value.branchId || value.branch_id || value.areaId)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["branchId"],
      message: "Branch is required",
    });
  }
});

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

// POST /api/stores - Create manual store record
router.post(
  "/",
  authMiddleware,
  requirePermission("STORES_EDIT", { scope: "branch", branchFrom: "body" }),
  requireNotDemo(),
  validate({ body: createBody }),
  asyncHandler(storeController.createStore)
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
  requireNotDemo(),
  validate({ params: idParams, body: updateBody }),
  asyncHandler(storeController.updateStore)
);

// DELETE /api/stores/:id - Soft archive store
router.delete(
  "/:id",
  authMiddleware,
  requirePermission("STORES_EDIT", { scope: "branch", branchFrom: "auto", storeLookup: true }),
  requireNotDemo(),
  validate({ params: idParams }),
  asyncHandler(storeController.archiveStore)
);

module.exports = router;
