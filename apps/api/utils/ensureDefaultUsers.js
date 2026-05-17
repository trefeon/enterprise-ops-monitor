const bcrypt = require("bcryptjs");
const { User, Role, UserRole } = require("../models");

function truthy(value) {
  if (value == null) return false;
  const v = String(value).trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "y" || v === "on";
}

function buildPasswordHash({ password, passwordHash }) {
  if (passwordHash) return String(passwordHash);
  if (!password) return null;
  return bcrypt.hashSync(String(password), 10);
}

function normalizeRoleName(role) {
  const r = String(role || "")
    .trim()
    .toLowerCase();
  if (!r || r === "user" || r === "viewer") return "viewer";
  if (r === "superadmin" || r === "super_admin" || r === "super-admin") {
    return "super_admin";
  }
  if (r === "operator") return "ops";
  if (r === "human capital") return "hc";
  if (r === "support") return "it";
  return r;
}

async function ensureUserRoleLink(userId, roleName) {
  if (!userId || !Role || !UserRole) {
    return { linked: false, reason: "rbac model unavailable" };
  }

  try {
    const normalized = normalizeRoleName(roleName);
    let role = await Role.findOne({ where: { name: normalized } });
    if (!role) {
      role = await Role.findOne({ where: { name: "viewer" } });
    }
    if (!role) {
      return { linked: false, reason: "roles table not seeded yet" };
    }

    const [, created] = await UserRole.findOrCreate({
      where: { user_id: userId, role_id: role.id },
    });

    return { linked: true, created };
  } catch (error) {
    const msg = String(error?.message || "").toLowerCase();
    if (msg.includes("relation") && msg.includes("does not exist")) {
      return { linked: false, reason: "rbac tables not migrated yet" };
    }
    throw error;
  }
}

async function upsertUser({ username, role, password, passwordHash, forcePasswordUpdate }) {
  if (!username) return { skipped: true, reason: "missing username" };
  const desiredRole = String(role || "").trim() || "viewer";
  const desiredHash = buildPasswordHash({ password, passwordHash });

  if (!desiredHash) {
    return { skipped: true, reason: `missing password/passwordHash for ${username}` };
  }

  const existing = await User.findOne({ where: { username } });

  if (!existing) {
    const created = await User.create({ username, role: desiredRole, password_hash: desiredHash });
    const roleLink = await ensureUserRoleLink(created.id, desiredRole);
    return {
      created: true,
      updated: false,
      userId: created.id,
      username,
      role: desiredRole,
      roleLink,
    };
  }

  const updates = {};
  if (String(existing.role || "").toLowerCase() !== String(desiredRole).toLowerCase()) {
    updates.role = desiredRole;
  }

  if (forcePasswordUpdate) {
    updates.password_hash = desiredHash;
  }

  const shouldUpdate = Object.keys(updates).length > 0;
  if (shouldUpdate) {
    await existing.update(updates);
  }

  const roleLink = await ensureUserRoleLink(existing.id, desiredRole);

  return {
    created: false,
    updated: shouldUpdate,
    username,
    role: shouldUpdate && updates.role ? updates.role : existing.role,
    roleLink,
  };
}

/**
 * Ensures 3 persistent test users exist in the database (viewer/admin/super_admin).
 *
 * Controlled via env:
 * - DEFAULT_USERS_ENABLED=true
 * - DEFAULT_VIEWER_USERNAME / DEFAULT_VIEWER_PASSWORD or DEFAULT_VIEWER_PASSWORD_HASH
 * - DEFAULT_ADMIN_USERNAME / DEFAULT_ADMIN_PASSWORD or DEFAULT_ADMIN_PASSWORD_HASH
 * - DEFAULT_SUPERADMIN_USERNAME / DEFAULT_SUPERADMIN_PASSWORD or DEFAULT_SUPERADMIN_PASSWORD_HASH
 * - DEFAULT_USERS_FORCE_PASSWORD=true (optional)
 */
async function ensureDefaultUsers() {
  if (!truthy(process.env.DEFAULT_USERS_ENABLED)) return { enabled: false };

  const forcePasswordUpdate = truthy(process.env.DEFAULT_USERS_FORCE_PASSWORD);

  const results = [];
  results.push(
    await upsertUser({
      username: process.env.DEFAULT_VIEWER_USERNAME || "viewer",
      role: "viewer",
      password: process.env.DEFAULT_VIEWER_PASSWORD,
      passwordHash: process.env.DEFAULT_VIEWER_PASSWORD_HASH,
      forcePasswordUpdate,
    })
  );

  results.push(
    await upsertUser({
      username: process.env.DEFAULT_ADMIN_USERNAME || "admin",
      role: "admin",
      password: process.env.DEFAULT_ADMIN_PASSWORD,
      passwordHash: process.env.DEFAULT_ADMIN_PASSWORD_HASH,
      forcePasswordUpdate,
    })
  );

  results.push(
    await upsertUser({
      username: process.env.DEFAULT_SUPERADMIN_USERNAME || "superadmin",
      role: "super_admin",
      password: process.env.DEFAULT_SUPERADMIN_PASSWORD,
      passwordHash: process.env.DEFAULT_SUPERADMIN_PASSWORD_HASH,
      forcePasswordUpdate,
    })
  );

  results.push(
    await upsertUser({
      username: process.env.DEFAULT_DEMO_USERNAME || "demo",
      role: "demo",
      password: process.env.DEFAULT_DEMO_PASSWORD,
      passwordHash: process.env.DEFAULT_DEMOADMIN_PASSWORD_HASH,
      forcePasswordUpdate,
    })
  );

  return { enabled: true, results };
}

module.exports = ensureDefaultUsers;
