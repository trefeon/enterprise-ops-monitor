const express = require("express");
const router = express.Router();
const { z } = require("zod");
const employeeController = require("../controllers/employeeController");
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/rbac");
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
  })
  .passthrough();

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

// GET /api/employees/by-store - Get employees by store with branch scope
router.get(
  "/by-store",
  authMiddleware,
  requirePermission("EMPLOYEES_VIEW", { scope: "branch", branchFrom: "auto", storeLookup: true }),
  validate({ query: byStoreQuery }),
  asyncHandler(employeeController.getEmployeesByStore)
);

module.exports = router;
