const express = require("express");
const { z } = require("zod");

const usersController = require("../controllers/usersController");
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/rbac");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const { passwordSchema } = require("../utils/validators");

const router = express.Router();

const paginationQuery = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(200).optional(),
    q: z.string().max(128).optional(),
  })
  .passthrough();

const roleEnum = z.enum(["viewer", "ops", "admin", "super_admin", "it", "hc"]);

const createBody = z
  .object({
    username: z.string().trim().min(1).max(64),
    password: passwordSchema,
    role: roleEnum.optional().default("viewer"),
  })
  .passthrough();

const updateParams = z.object({ id: z.coerce.number().int().positive() });

const updateBody = z
  .object({
    role: roleEnum,
  })
  .passthrough();

const resetBody = z
  .object({
    confirm: z.boolean(),
  })
  .passthrough();

// RBAC v2 endpoints
const updateRolesBody = z.object({
  role_ids: z.array(z.coerce.number().int().positive()).min(0).max(20),
});

const updatePermissionsBody = z.object({
  allow: z.array(z.string().max(50)).optional().default([]),
  deny: z.array(z.string().max(50)).optional().default([]),
});

const updateBranchScopeBody = z.object({
  branch_ids: z.array(z.coerce.number().int().positive()).min(0).max(100),
});

const changeUserPasswordBody = z.object({
  newPassword: passwordSchema,
});

// GET /api/users - List users with roles and scope
router.get(
  "/",
  authMiddleware,
  requirePermission("USERS_VIEW"),
  validate({ query: paginationQuery }),
  asyncHandler(usersController.listUsers)
);

// POST /api/users - Create user
router.post(
  "/",
  authMiddleware,
  requirePermission("USERS_CREATE"),
  validate({ body: createBody }),
  asyncHandler(usersController.createUser)
);

// PATCH /api/users/:id - Update user (legacy role)
router.patch(
  "/:id",
  authMiddleware,
  requirePermission("USERS_EDIT"),
  validate({ params: updateParams, body: updateBody }),
  asyncHandler(usersController.updateUser)
);

// POST /api/users/:id/reset-password - Reset password
router.post(
  "/:id/reset-password",
  authMiddleware,
  requirePermission("USERS_RESET_PASSWORD"),
  validate({ params: updateParams, body: resetBody }),
  asyncHandler(usersController.resetPassword)
);

// PATCH /api/users/:id/roles - Update user roles (RBAC v2)
router.patch(
  "/:id/roles",
  authMiddleware,
  requirePermission("USERS_ROLE_EDIT"),
  validate({ params: updateParams, body: updateRolesBody }),
  asyncHandler(usersController.updateUserRoles)
);

// PATCH /api/users/:id/permissions - Update user permission overrides (RBAC v2)
router.patch(
  "/:id/permissions",
  authMiddleware,
  requirePermission("USERS_PERMISSION_EDIT"),
  validate({ params: updateParams, body: updatePermissionsBody }),
  asyncHandler(usersController.updateUserPermissions)
);

// PATCH /api/users/:id/branch-scope - Update user branch scope (RBAC v2)
router.patch(
  "/:id/branch-scope",
  authMiddleware,
  requirePermission("USERS_SCOPE_EDIT"),
  validate({ params: updateParams, body: updateBranchScopeBody }),
  asyncHandler(usersController.updateUserBranchScope)
);

// GET /api/users/:id - Get user details (RBAC v2)
router.get(
  "/:id",
  authMiddleware,
  requirePermission("USERS_VIEW"),
  validate({ params: updateParams }),
  asyncHandler(usersController.getUser)
);

// PATCH /api/users/:id/password - Change user password (superadmin only)
router.patch(
  "/:id/password",
  authMiddleware,
  requirePermission("USERS_CHANGE_PASSWORD"),
  validate({ params: updateParams, body: changeUserPasswordBody }),
  asyncHandler(usersController.changeUserPassword)
);

// DELETE /api/users/:id - Delete user
router.delete(
  "/:id",
  authMiddleware,
  requirePermission("USERS_DELETE"),
  validate({ params: updateParams }),
  asyncHandler(usersController.deleteUser)
);

module.exports = router;
