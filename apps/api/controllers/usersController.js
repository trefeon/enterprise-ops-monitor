const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { Op } = require("sequelize");
const {
  User,
  Role,
  UserRole,
  UserPermissionOverride,
  UserBranchScope,
  sequelize,
} = require("../models");
const { ok, fail } = require("../utils/response");
const { normalizeRole } = require("../utils/roleMap");
const { getPagination, buildPaginationMeta } = require("../utils/pagination");
const { ALL_PERMISSIONS } = require("../lib/permissions");
const { assertCanManageTarget } = require("../utils/rbacHelpers");

function sanitizeUser(user, extraData = {}) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    role: normalizeRole(user.role), // Legacy field
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    ...extraData,
  };
}

exports.listUsers = async (req, res) => {
  const { page, pageSize, offset, limit } = getPagination(req.query, {
    pageSize: 25,
    maxPageSize: 200,
  });
  const q = String(req.query?.q || "").trim();

  const where = {};
  if (q) {
    where.username = { [Op.iLike]: `%${q}%` };
  }

  const result = await User.findAndCountAll({
    where,
    order: [["username", "ASC"]],
    limit,
    offset,
    include: [
      {
        model: Role,
        as: "roles",
        attributes: ["id", "name", "label"],
        through: { attributes: [] },
      },
      {
        model: UserPermissionOverride,
        as: "permissionOverrides",
        attributes: ["permission", "effect"],
      },
      {
        model: UserBranchScope,
        as: "branchScopes",
        attributes: ["branch_id"],
      },
    ],
  });

  const users = (result.rows || []).map((user) => {
    const roles = (user.roles || []).map((r) => ({ id: r.id, name: r.name, label: r.label }));
    const overrides = user.permissionOverrides || [];
    const branchScopes = (user.branchScopes || []).map((bs) => bs.branch_id);

    return sanitizeUser(user, {
      roles,
      overridesCount: {
        allow: overrides.filter((o) => o.effect === "allow").length,
        deny: overrides.filter((o) => o.effect === "deny").length,
      },
      branchScope: branchScopes.length === 0 ? "ALL" : branchScopes,
    });
  });

  const meta = buildPaginationMeta(page, pageSize, result.count || 0);
  return ok(res, { users }, meta);
};

exports.getUser = async (req, res) => {
  const userId = req.params.id;

  const user = await User.findByPk(userId, {
    include: [
      {
        model: Role,
        as: "roles",
        attributes: ["id", "name", "label"],
        through: { attributes: [] },
      },
      {
        model: UserPermissionOverride,
        as: "permissionOverrides",
        attributes: ["permission", "effect"],
      },
      {
        model: UserBranchScope,
        as: "branchScopes",
        attributes: ["branch_id"],
      },
    ],
  });

  if (!user) {
    return fail(res, 404, "NOT_FOUND", "User not found");
  }

  const roles = (user.roles || []).map((r) => ({ id: r.id, name: r.name, label: r.label }));
  const overrides = {
    allow: (user.permissionOverrides || [])
      .filter((o) => o.effect === "allow")
      .map((o) => o.permission),
    deny: (user.permissionOverrides || [])
      .filter((o) => o.effect === "deny")
      .map((o) => o.permission),
  };
  const branchScopes = (user.branchScopes || []).map((bs) => bs.branch_id);

  return ok(res, {
    user: sanitizeUser(user, {
      roles,
      overrides,
      branchScope: branchScopes.length === 0 ? "ALL" : branchScopes,
    }),
  });
};

exports.createUser = async (req, res) => {
  const actorRole = normalizeRole(req.user?.role);
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  const role = normalizeRole(req.body?.role || "viewer");

  if (!username || !password) {
    return fail(res, 400, "VALIDATION_ERROR", "Username and password are required", {
      requestId: req.id || null,
    });
  }

  const roleCheck = assertCanManageTarget({ actorRole, targetRole: "viewer", nextRole: role });
  if (!roleCheck.ok) {
    return fail(res, roleCheck.status, roleCheck.code, roleCheck.message, {
      requestId: req.id || null,
    });
  }

  const existing = await User.findOne({ where: { username } });
  if (existing) {
    return fail(res, 409, "ALREADY_EXISTS", "Username already exists", {
      requestId: req.id || null,
    });
  }

  const transaction = await sequelize.transaction();
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await User.create(
      { username, role, password_hash: passwordHash },
      { transaction }
    );

    // Also add to user_roles
    // Use the normalized role name to find the ID
    const roleRecord = await Role.findOne({ where: { name: role } });
    if (roleRecord) {
      await UserRole.create({ user_id: created.id, role_id: roleRecord.id }, { transaction });
    } else {
      // Fallback: if role not found in DB (should not happen for system roles), default to 'viewer'
      const viewerRole = await Role.findOne({ where: { name: "viewer" } });
      if (viewerRole) {
        await UserRole.create({ user_id: created.id, role_id: viewerRole.id }, { transaction });
      }
    }

    await transaction.commit();
    return ok(res, { user: sanitizeUser(created) }, { requestId: req.id || null }, 201);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

exports.updateUser = async (req, res) => {
  const actorRole = normalizeRole(req.user?.role);
  const userId = req.params?.id;
  const nextRoleRaw = req.body?.role;

  if (!nextRoleRaw) {
    return fail(res, 400, "VALIDATION_ERROR", "No updates provided", { requestId: req.id || null });
  }

  const user = await User.findByPk(userId);
  if (!user) {
    return fail(res, 404, "NOT_FOUND", "User not found", { requestId: req.id || null });
  }

  const nextRole = normalizeRole(nextRoleRaw);
  const roleCheck = assertCanManageTarget({ actorRole, targetRole: user.role, nextRole });
  if (!roleCheck.ok) {
    return fail(res, roleCheck.status, roleCheck.code, roleCheck.message, {
      requestId: req.id || null,
    });
  }

  if (normalizeRole(user.role) !== nextRole) {
    await user.update({ role: nextRole });
  }

  return ok(res, { user: sanitizeUser(user) }, { requestId: req.id || null });
};

exports.resetPassword = async (req, res) => {
  const actorRole = normalizeRole(req.user?.role);
  const userId = req.params?.id;

  const confirm = Boolean(req.body?.confirm);
  if (!confirm) {
    return fail(res, 400, "VALIDATION_ERROR", "Confirmation is required", {
      requestId: req.id || null,
    });
  }

  const user = await User.findByPk(userId);
  if (!user) {
    return fail(res, 404, "NOT_FOUND", "User not found", { requestId: req.id || null });
  }

  const roleCheck = assertCanManageTarget({ actorRole, targetRole: user.role, nextRole: null });
  if (!roleCheck.ok) {
    return fail(res, roleCheck.status, roleCheck.code, roleCheck.message, {
      requestId: req.id || null,
    });
  }

  const tempPassword = crypto.randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await user.update({ password_hash: passwordHash });

  return ok(
    res,
    {
      user: sanitizeUser(user),
      tempPassword,
    },
    { requestId: req.id || null }
  );
};

// RBAC v2 Endpoints

exports.updateUserRoles = async (req, res) => {
  const actorRole = normalizeRole(req.user?.role);
  const userId = req.params.id;
  const { role_ids } = req.body;

  const user = await User.findByPk(userId);
  if (!user) {
    return fail(res, 404, "NOT_FOUND", "User not found");
  }

  // Check if actor can manage this user
  const targetCheck = assertCanManageTarget({ actorRole, targetRole: user.role });
  if (!targetCheck.ok) {
    return fail(res, targetCheck.status, targetCheck.code, targetCheck.message);
  }

  // Validate role_ids exist
  if (role_ids.length > 0) {
    const roles = await Role.findAll({ where: { id: role_ids } });
    if (roles.length !== role_ids.length) {
      return fail(res, 400, "VALIDATION_ERROR", "Some role IDs are invalid");
    }

    // Check if actor can assign these roles
    for (const newRole of roles) {
      const assignmentCheck = assertCanManageTarget({
        actorRole,
        targetRole: "viewer", // Dummy target; we check if actor can assign nextRole
        nextRole: newRole.name,
      });
      if (!assignmentCheck.ok) {
        return fail(res, assignmentCheck.status, assignmentCheck.code, assignmentCheck.message);
      }
    }
  }

  const transaction = await sequelize.transaction();
  try {
    // Remove existing roles
    await UserRole.destroy({ where: { user_id: userId }, transaction });

    // Add new roles
    if (role_ids.length > 0) {
      const records = role_ids.map((role_id) => ({ user_id: userId, role_id }));
      await UserRole.bulkCreate(records, { transaction });
    }

    // Update legacy role field with primary role
    if (role_ids.length > 0) {
      const primaryRole = await Role.findByPk(role_ids[0]);
      if (primaryRole) {
        await user.update({ role: primaryRole.name }, { transaction });
      }
    }

    await transaction.commit();

    // Return updated roles
    const updatedRoles = await Role.findAll({
      where: { id: role_ids },
      attributes: ["id", "name", "label"],
    });

    return ok(res, {
      user: sanitizeUser(user),
      roles: updatedRoles.map((r) => ({ id: r.id, name: r.name, label: r.label })),
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

exports.updateUserPermissions = async (req, res) => {
  const actorRole = normalizeRole(req.user?.role);
  const userId = req.params.id;
  const { allow, deny } = req.body;

  const user = await User.findByPk(userId);
  if (!user) {
    return fail(res, 404, "NOT_FOUND", "User not found");
  }

  // Check if actor can manage this user
  const targetCheck = assertCanManageTarget({ actorRole, targetRole: user.role });
  if (!targetCheck.ok) {
    return fail(res, targetCheck.status, targetCheck.code, targetCheck.message);
  }

  // Validate permissions
  const allPerms = [...allow, ...deny];
  const invalidPerms = allPerms.filter((p) => !ALL_PERMISSIONS.includes(p));
  if (invalidPerms.length > 0) {
    return fail(res, 400, "VALIDATION_ERROR", `Invalid permissions: ${invalidPerms.join(", ")}`);
  }

  // Check for conflicts
  const conflicts = allow.filter((p) => deny.includes(p));
  if (conflicts.length > 0) {
    return fail(
      res,
      400,
      "VALIDATION_ERROR",
      `Permission cannot be both allowed and denied: ${conflicts.join(", ")}`
    );
  }

  const transaction = await sequelize.transaction();
  try {
    // Clear existing overrides
    await UserPermissionOverride.destroy({ where: { user_id: userId }, transaction });

    // Insert new overrides
    const records = [
      ...allow.map((permission) => ({ user_id: userId, permission, effect: "allow" })),
      ...deny.map((permission) => ({ user_id: userId, permission, effect: "deny" })),
    ];

    if (records.length > 0) {
      await UserPermissionOverride.bulkCreate(records, { transaction });
    }

    await transaction.commit();

    return ok(res, {
      user: sanitizeUser(user),
      overrides: { allow, deny },
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

exports.updateUserBranchScope = async (req, res) => {
  const actorRole = normalizeRole(req.user?.role);
  const userId = req.params.id;
  const { branch_ids } = req.body;

  const user = await User.findByPk(userId);
  if (!user) {
    return fail(res, 404, "NOT_FOUND", "User not found");
  }

  // Check if actor can manage this user
  const targetCheck = assertCanManageTarget({ actorRole, targetRole: user.role });
  if (!targetCheck.ok) {
    return fail(res, targetCheck.status, targetCheck.code, targetCheck.message);
  }

  // Note: branch_ids = [] means ALL branches (no restriction)

  const transaction = await sequelize.transaction();
  try {
    // Clear existing scopes
    await UserBranchScope.destroy({ where: { user_id: userId }, transaction });

    // Insert new scopes (only if not empty = not "ALL")
    if (branch_ids.length > 0) {
      const records = branch_ids.map((branch_id) => ({ user_id: userId, branch_id }));
      await UserBranchScope.bulkCreate(records, { transaction });
    }

    await transaction.commit();

    return ok(res, {
      user: sanitizeUser(user),
      branchScope: branch_ids.length === 0 ? "ALL" : branch_ids,
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

exports.changeUserPassword = async (req, res) => {
  const actorRole = normalizeRole(req.user?.role);
  const userId = req.params.id;
  const { newPassword } = req.body;

  const user = await User.findByPk(userId);
  if (!user) {
    return fail(res, 404, "NOT_FOUND", "User not found", { requestId: req.id || null });
  }

  // Check if actor can manage this user
  const targetCheck = assertCanManageTarget({ actorRole, targetRole: user.role });
  if (!targetCheck.ok) {
    return fail(res, targetCheck.status, targetCheck.code, targetCheck.message, {
      requestId: req.id || null,
    });
  }

  // Hash new password and update
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await user.update({ password_hash: passwordHash });

  return ok(
    res,
    {
      user: sanitizeUser(user),
      message: "Password changed successfully",
    },
    { requestId: req.id || null }
  );
};

exports.deleteUser = async (req, res) => {
  const actorRole = normalizeRole(req.user?.role);
  const userId = req.params.id;

  // Prevent self-deletion
  if (String(req.user.id) === String(userId)) {
    return fail(res, 400, "VALIDATION_ERROR", "Cannot delete your own account");
  }

  const user = await User.findByPk(userId);
  if (!user) {
    return fail(res, 404, "NOT_FOUND", "User not found");
  }

  // Check role hierarchy permissions
  const roleCheck = assertCanManageTarget({ actorRole, targetRole: user.role, nextRole: null });
  if (!roleCheck.ok) {
    return fail(res, roleCheck.status, roleCheck.code, roleCheck.message);
  }

  const transaction = await sequelize.transaction();
  try {
    // 1. Delete associated data (cascade manually to be safe, though DB might handle it)
    await UserRole.destroy({ where: { user_id: userId }, transaction });
    await UserBranchScope.destroy({ where: { user_id: userId }, transaction });
    await UserPermissionOverride.destroy({ where: { user_id: userId }, transaction });

    // 2. Delete the user
    await user.destroy({ transaction });

    await transaction.commit();

    return ok(res, { message: `User ${user.username} deleted successfully` });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
