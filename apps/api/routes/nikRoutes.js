const express = require("express");
const router = express.Router();
const { z } = require("zod");
const identityController = require("../controllers/identityController");
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/rbac");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");

const querySchema = z
  .object({
    query: z.string().min(1),
  })
  .passthrough();

const listSchema = z
  .object({
    query: z.string().optional(),
    branchId: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(200).optional(),
  })
  .passthrough();

router.get(
  "/list",
  authMiddleware,
  requirePermission("NIK_LOOKUP"),
  validate({ query: listSchema }),
  asyncHandler(identityController.listEmployees)
);

// GET /api/nik/roles - Get unique roles from employee list
router.get(
  "/roles",
  authMiddleware,
  requirePermission("NIK_LOOKUP"),
  asyncHandler(identityController.getRoles)
);

router.get(
  "/lookup",
  authMiddleware,
  requirePermission("NIK_LOOKUP"),
  validate({ query: querySchema }),
  asyncHandler(identityController.checkIdentity)
);

module.exports = router;
