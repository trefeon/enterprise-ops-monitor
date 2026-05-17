const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { User } = require("../models");
const { ok, fail } = require("../utils/response");
const { normalizeRole } = require("../utils/roleMap");
const { loadUserAuthz } = require("../services/authzService");
const env = require("../config/env");

const verifyPassword = (password, hash) => {
  // Check if bcrypt
  if (hash.startsWith("$2")) {
    return bcrypt.compareSync(password, hash);
  }
  // Check SHA256 (64 hex chars)
  if (hash.length === 64) {
    const sha256 = crypto.createHash("sha256").update(password).digest("hex");
    // Use timingSafeEqual to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(sha256), Buffer.from(hash));
  }
  return false;
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return fail(res, 400, "VALIDATION_ERROR", "Username and password are required", {
        requestId: req.id || null,
      });
    }

    let user = null;
    let role = "viewer";
    let isEnvAdmin = false;

    // 1. Check Admin from Env
    if (env.ADMIN_USERNAME && username === env.ADMIN_USERNAME) {
      if (verifyPassword(password, env.ADMIN_PASSWORD_HASH)) {
        user = { id: "env_admin", username: env.ADMIN_USERNAME };
        role = "super_admin";
        isEnvAdmin = true;
      }
    }

    // 2. Check DB User if not found yet
    if (!user) {
      const dbUser = await User.findOne({ where: { username } });
      if (dbUser && verifyPassword(password, dbUser.password_hash)) {
        user = dbUser;
        role = normalizeRole(dbUser.role);

        // Legacy hash migration: Migrate legacy SHA256 hashes to Bcrypt
        if (!dbUser.password_hash.startsWith("$2")) {
          try {
            const newHash = await bcrypt.hash(password, 10);
            await dbUser.update({ password_hash: newHash });
            // eslint-disable-next-line no-console
            console.log(`Migrated legacy password hash for user ${dbUser.username}`);
          } catch (err) {
            console.error(
              `Failed to migrate password hash for user ${dbUser.username}:`,
              err.message
            );
          }
        }
      }
    }

    if (!user) {
      return fail(res, 401, "INVALID_CREDENTIALS", "Invalid username or password", {
        requestId: req.id || null,
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: normalizeRole(role) },
      env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // RBAC v2: Load authorization data for login response (for DB users)
    let authzData = {};
    if (!isEnvAdmin && user.id) {
      const authz = await loadUserAuthz(user.id);
      if (authz) {
        authzData = {
          roleNames: authz.roleNames,
          effectivePerms: authz.effectivePerms,
          scopeBranches: authz.scopeBranches,
          isAllBranches: authz.isAllBranches,
        };
        // Override the legacy role with the primary RBAC role if available
        if (authz.roleNames && authz.roleNames.length > 0) {
          role = authz.roleNames[0];
        } else {
          // Fallback: This user has no RBAC roles assigned in user_roles table!
          console.warn(`User ${user.username} has no RBAC roles! access might be limited.`);
        }
      }
    } else if (isEnvAdmin) {
      // Env admin gets all permissions
      const { ALL_PERMISSIONS } = require("../lib/permissions");
      authzData = {
        roleNames: ["super_admin"],
        effectivePerms: ALL_PERMISSIONS,
        scopeBranches: [],
        isAllBranches: true,
      };
    }

    return ok(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: normalizeRole(role),
        ...authzData,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Internal server error", { requestId: req.id || null });
  }
};

exports.logout = (req, res) => {
  return ok(res, { message: "Logout successful" });
};

exports.me = async (req, res) => {
  // RBAC v2: Return full authorization data
  const authz = req.authz;

  if (!authz) {
    // Fallback to basic user info
    return ok(res, { user: req.user });
  }

  return ok(res, {
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      roleNames: authz.roleNames,
      effectivePerms: authz.effectivePerms,
      scopeBranches: authz.scopeBranches,
      isAllBranches: authz.isAllBranches,
    },
  });
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const userId = req.user?.id;

    // Env admin cannot change password (it's in .env)
    if (userId === "env_admin") {
      return fail(res, 400, "NOT_ALLOWED", "Environment admin password cannot be changed via API", {
        requestId: req.id || null,
      });
    }

    if (!userId) {
      return fail(res, 401, "UNAUTHORIZED", "User not authenticated", {
        requestId: req.id || null,
      });
    }

    // Find user in DB
    const user = await User.findByPk(userId);
    if (!user) {
      return fail(res, 404, "NOT_FOUND", "User not found", { requestId: req.id || null });
    }

    // Verify current password
    const isValid = verifyPassword(currentPassword, user.password_hash);
    if (!isValid) {
      return fail(res, 400, "INVALID_PASSWORD", "Current password is incorrect", {
        requestId: req.id || null,
      });
    }

    // Hash new password and update
    const newHash = await bcrypt.hash(newPassword, 10);
    await user.update({ password_hash: newHash });

    return ok(res, { message: "Password changed successfully" }, { requestId: req.id || null });
  } catch (error) {
    console.error("Change password error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Internal server error", { requestId: req.id || null });
  }
};
