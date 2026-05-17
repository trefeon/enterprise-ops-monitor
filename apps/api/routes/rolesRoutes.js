const express = require("express");
const { z } = require("zod");
const rolesController = require("../controllers/rolesController");
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission, requireNotDemo } = require("../middleware/rbac");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const idParams = z.object({ id: z.coerce.number().int().positive() });

const createBody = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(/^[a-z_]+$/, "name must be lowercase with underscores"),
  label: z.string().trim().min(1).max(100),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string().max(50)).optional().default([]),
});

const updateBody = z.object({
  label: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  permissions: z.array(z.string().max(50)).optional(),
});

// GET /api/roles - List all roles
router.get(
  "/",
  authMiddleware,
  requirePermission("ROLES_VIEW"),
  asyncHandler(rolesController.listRoles)
);

// POST /api/roles - Create new role
router.post(
  "/",
  authMiddleware,
  requirePermission("ROLES_EDIT"),
  requireNotDemo(),
  validate({ body: createBody }),
  asyncHandler(rolesController.createRole)
);

// GET /api/roles/:id - Get role details
router.get(
  "/:id",
  authMiddleware,
  requirePermission("ROLES_VIEW"),
  validate({ params: idParams }),
  asyncHandler(rolesController.getRole)
);

// PUT /api/roles/:id - Update role
router.put(
  "/:id",
  authMiddleware,
  requirePermission("ROLES_EDIT"),
  requireNotDemo(),
  validate({ params: idParams, body: updateBody }),
  asyncHandler(rolesController.updateRole)
);

// DELETE /api/roles/:id - Delete role
router.delete(
  "/:id",
  authMiddleware,
  requirePermission("ROLES_EDIT"),
  requireNotDemo(),
  validate({ params: idParams }),
  asyncHandler(rolesController.deleteRole)
);

module.exports = router;
