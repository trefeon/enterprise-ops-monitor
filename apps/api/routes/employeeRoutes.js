const express = require("express");
const router = express.Router();
const { z } = require("zod");
const employeeController = require("../controllers/employeeController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireNotDemo, requirePermission } = require("../middleware/rbac");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");

const byStoreQuery = z
  .object({
    storeCode: z.string().min(1),
  })
  .passthrough();

const listQuery = z
  .object({
    query: z.string().optional(),
    q: z.string().optional(),
    search: z.string().optional(),
    branchId: z.string().optional(),
    branch: z.string().optional(),
    role: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(200).optional(),
  })
  .passthrough();

const nikParams = z.object({ nik: z.string().min(1) });
const employeeBody = z
  .object({
    nik: z.string().min(1).optional(),
    empid: z.string().min(1).optional(),
    fullName: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    full_name: z.string().min(1).optional(),
    role: z.string().optional(),
    jobName: z.string().optional(),
    job_name: z.string().optional(),
    branchId: z.union([z.string(), z.number()]).optional(),
    branch_id: z.union([z.string(), z.number()]).optional(),
    branchName: z.string().optional(),
    branch_name: z.string().optional(),
    storeCode: z.union([z.string(), z.number()]).optional(),
    store_code: z.union([z.string(), z.number()]).optional(),
    storeName: z.string().optional(),
    store_name: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .strict();
const createEmployeeBody = employeeBody.superRefine((value, ctx) => {
  if (!(value.nik || value.empid)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["nik"], message: "NIK is required" });
  }
  if (!(value.fullName || value.name || value.full_name)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["fullName"],
      message: "Full name is required",
    });
  }
  if (!(value.branchId || value.branch_id)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["branchId"],
      message: "Branch is required",
    });
  }
});

// GET /api/employees/roles - Get unique roles
router.get(
  "/roles",
  authMiddleware,
  requirePermission("EMPLOYEES_VIEW", { scope: "branch", branchFrom: "query" }),
  asyncHandler(employeeController.getRoles)
);

// GET /api/employees - List employees with branch scope
router.get(
  "/",
  authMiddleware,
  requirePermission("EMPLOYEES_VIEW", { scope: "branch", branchFrom: "query" }),
  validate({ query: listQuery }),
  asyncHandler(employeeController.getEmployees)
);

// POST /api/employees - Create manual employee record
router.post(
  "/",
  authMiddleware,
  requirePermission("EMPLOYEES_EDIT", { scope: "branch", branchFrom: "body" }),
  requireNotDemo(),
  validate({ body: createEmployeeBody }),
  asyncHandler(employeeController.createEmployee)
);

// GET /api/employees/export - Export employees as XLSX
router.get(
  "/export",
  authMiddleware,
  requirePermission("EMPLOYEES_VIEW", { scope: "branch", branchFrom: "query" }),
  validate({ query: listQuery }),
  asyncHandler(employeeController.exportEmployees)
);

// GET /api/employees/by-store - Get employees by store with branch scope
router.get(
  "/by-store",
  authMiddleware,
  requirePermission("EMPLOYEES_VIEW", { scope: "branch", branchFrom: "auto", storeLookup: true }),
  validate({ query: byStoreQuery }),
  asyncHandler(employeeController.getEmployeesByStore)
);

// PUT /api/employees/:nik - Update manual employee record
router.put(
  "/:nik",
  authMiddleware,
  requirePermission("EMPLOYEES_EDIT"),
  requireNotDemo(),
  validate({ params: nikParams, body: employeeBody }),
  asyncHandler(employeeController.updateEmployee)
);

// DELETE /api/employees/:nik - Soft archive employee record
router.delete(
  "/:nik",
  authMiddleware,
  requirePermission("EMPLOYEES_EDIT"),
  requireNotDemo(),
  validate({ params: nikParams }),
  asyncHandler(employeeController.archiveEmployee)
);

module.exports = router;
