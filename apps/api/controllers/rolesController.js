const { Role, RolePermission, UserRole, sequelize } = require("../models");
const { ok, fail } = require("../utils/response");
const { ALL_PERMISSIONS } = require("../lib/permissions");

/**
 * List all roles with user count
 */
exports.listRoles = async (req, res) => {
  const roles = await Role.findAll({
    include: [
      {
        model: RolePermission,
        as: "permissions",
        attributes: ["permission"],
      },
    ],
    order: [
      ["is_system", "DESC"],
      ["name", "ASC"],
    ],
  });

  // Get user counts per role
  const userCounts = await UserRole.findAll({
    attributes: ["role_id", [sequelize.fn("COUNT", sequelize.col("user_id")), "count"]],
    group: ["role_id"],
    raw: true,
  });

  const userCountMap = userCounts.reduce((acc, uc) => {
    acc[uc.role_id] = parseInt(uc.count, 10);
    return acc;
  }, {});

  const rolesData = roles.map((role) => ({
    id: role.id,
    name: role.name,
    label: role.label,
    description: role.description,
    is_system: role.is_system,
    permissions: (role.permissions || []).map((p) => p.permission),
    userCount: userCountMap[role.id] || 0,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  }));

  return ok(res, { roles: rolesData });
};

/**
 * Get single role with details
 */
exports.getRole = async (req, res) => {
  const roleId = req.params.id;

  const role = await Role.findByPk(roleId, {
    include: [
      {
        model: RolePermission,
        as: "permissions",
        attributes: ["permission"],
      },
    ],
  });

  if (!role) {
    return fail(res, 404, "NOT_FOUND", "Role not found");
  }

  // Get user count
  const userCount = await UserRole.count({ where: { role_id: roleId } });

  return ok(res, {
    role: {
      id: role.id,
      name: role.name,
      label: role.label,
      description: role.description,
      is_system: role.is_system,
      permissions: (role.permissions || []).map((p) => p.permission),
      userCount,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    },
  });
};

/**
 * Create new role
 */
exports.createRole = async (req, res) => {
  const { name, label, description, permissions } = req.body;

  // Check for duplicate name
  const existing = await Role.findOne({ where: { name } });
  if (existing) {
    return fail(res, 409, "ALREADY_EXISTS", "Role with this name already exists");
  }

  // Validate permissions
  const invalidPerms = permissions.filter((p) => !ALL_PERMISSIONS.includes(p));
  if (invalidPerms.length > 0) {
    return fail(res, 400, "VALIDATION_ERROR", `Invalid permissions: ${invalidPerms.join(", ")}`);
  }

  const transaction = await sequelize.transaction();
  try {
    const role = await Role.create(
      {
        name,
        label,
        description: description || null,
        is_system: false,
      },
      { transaction }
    );

    // Add permissions
    if (permissions.length > 0) {
      const permRecords = permissions.map((permission) => ({
        role_id: role.id,
        permission,
      }));
      await RolePermission.bulkCreate(permRecords, { transaction });
    }

    await transaction.commit();

    return ok(
      res,
      {
        role: {
          id: role.id,
          name: role.name,
          label: role.label,
          description: role.description,
          is_system: role.is_system,
          permissions,
        },
      },
      null,
      201
    );
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Update role
 */
exports.updateRole = async (req, res) => {
  const roleId = req.params.id;
  const { label, description, permissions } = req.body;

  const role = await Role.findByPk(roleId);
  if (!role) {
    return fail(res, 404, "NOT_FOUND", "Role not found");
  }

  // System roles can only have label/description updated, not name or permissions deleted
  // But we can add permissions

  const updates = {};
  if (label !== undefined) updates.label = label;
  if (description !== undefined) updates.description = description;

  const transaction = await sequelize.transaction();
  try {
    // Update role fields
    if (Object.keys(updates).length > 0) {
      await role.update(updates, { transaction });
    }

    // Update permissions if provided
    if (permissions !== undefined) {
      // Validate permissions
      const invalidPerms = permissions.filter((p) => !ALL_PERMISSIONS.includes(p));
      if (invalidPerms.length > 0) {
        await transaction.rollback();
        return fail(
          res,
          400,
          "VALIDATION_ERROR",
          `Invalid permissions: ${invalidPerms.join(", ")}`
        );
      }

      // Replace permissions
      await RolePermission.destroy({ where: { role_id: roleId }, transaction });
      if (permissions.length > 0) {
        const permRecords = permissions.map((permission) => ({
          role_id: roleId,
          permission,
        }));
        await RolePermission.bulkCreate(permRecords, { transaction });
      }
    }

    await transaction.commit();

    // Reload with permissions
    const updatedRole = await Role.findByPk(roleId, {
      include: [{ model: RolePermission, as: "permissions", attributes: ["permission"] }],
    });

    return ok(res, {
      role: {
        id: updatedRole.id,
        name: updatedRole.name,
        label: updatedRole.label,
        description: updatedRole.description,
        is_system: updatedRole.is_system,
        permissions: (updatedRole.permissions || []).map((p) => p.permission),
      },
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Delete role
 */
exports.deleteRole = async (req, res) => {
  const roleId = req.params.id;

  const role = await Role.findByPk(roleId);
  if (!role) {
    return fail(res, 404, "NOT_FOUND", "Role not found");
  }

  // Cannot delete system roles
  if (role.is_system) {
    return fail(res, 400, "CANNOT_DELETE", "Cannot delete system role");
  }

  // Check if role is assigned to any users
  const userCount = await UserRole.count({ where: { role_id: roleId } });
  if (userCount > 0) {
    return fail(
      res,
      400,
      "CANNOT_DELETE",
      `Role is assigned to ${userCount} user(s). Remove assignments first.`
    );
  }

  await role.destroy();

  return ok(res, { message: "Role deleted successfully" });
};
