const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("../models");
const { User } = db;
const { ok, fail } = require("../utils/response");
const { normalizeRole } = require("../utils/roleMap");
const { loadUserAuthz } = require("../services/authzService");
const {
  setAuthTokenCookie,
  setRefreshTokenCookie,
  REFRESH_COOKIE_NAME,
} = require("../utils/jwtCookie");
const { applyTenantContext } = require("../middleware/tenantContext");
const env = require("../config/env");

// ── Refresh tokens (issue #12) ────────────────────────────────────────────
// 30-day lifetime — must match REFRESH_COOKIE_MAX_AGE_MS in utils/jwtCookie.js.
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const sha256hex = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

/**
 * Extract the raw refresh token from a request: body first, then the httpOnly
 * refresh_token cookie. The app has no cookie-parser, so the cookie is parsed
 * manually (same pattern as cookieToBearer in authRoutes.js).
 */
function extractRefreshToken(req) {
  const fromBody = req.body?.refreshToken;
  if (fromBody) return fromBody;
  const cookieHeader = req.headers.cookie || "";
  const part = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${REFRESH_COOKIE_NAME}=`));
  if (!part) return null;
  try {
    const raw = decodeURIComponent(part.slice(REFRESH_COOKIE_NAME.length + 1));
    return raw || null;
  } catch {
    return null;
  }
}

/**
 * Issue a new refresh token for a user. Only the SHA-256 hash of the raw token
 * is persisted. Non-fatal: a failed DB write must never fail login/register —
 * it returns null and the caller simply omits the refresh token.
 *
 * @param {object} user - DB user instance (id, org_id) or passport user object
 *   (id, orgId — Google callback).
 * @returns {Promise<string|null>} raw refresh token, or null on failure.
 */
async function issueRefreshToken(user) {
  if (!user || !user.id) return null;
  const orgId = user.org_id ?? user.orgId ?? null;
  // A tenant-less token row is meaningless under the strict RLS policies, so
  // without an org we fail closed (no token) rather than store an unscoped one.
  if (!orgId) return null;
  try {
    const raw = crypto.randomBytes(32).toString("hex");
    // Run the INSERT inside a transaction that first establishes the RLS tenant
    // context. Legacy /api/auth* mounts run NO mount-level tenantMiddleware
    // (app.js mounts authRoutes via mountLegacyOnly), so without this the strict
    // `WITH CHECK (org_id = current_setting('app.tenant_id', TRUE))` policy would
    // reject the row (unset GUC → NULL → false) and refresh tokens would silently
    // never be issued in production. set_config(..., true) scopes the value to
    // this transaction, so the pooled connection cannot leak tenant context.
    await db.sequelize.transaction(async (transaction) => {
      await transaction.sequelize.query(
        "SELECT set_config('app.tenant_id', $1, true), set_config('app.is_super_admin', 'false', true)",
        { bind: [orgId], transaction }
      );
      await db.RefreshToken.create(
        {
          user_id: user.id,
          org_id: orgId,
          token_hash: sha256hex(raw),
          expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
        { transaction }
      );
    });
    return raw;
  } catch (err) {
    // Non-fatal by design: refresh-token persistence must not break auth.
    // eslint-disable-next-line no-console
    console.warn("[auth] failed to issue refresh token (non-fatal):", err.message);
    return null;
  }
}

/**
 * Revoke a refresh token (rotation/logout). Non-fatal.
 */
async function revokeRefreshToken(raw) {
  if (!raw) return;
  try {
    await db.RefreshToken.update(
      { revoked_at: new Date() },
      { where: { token_hash: sha256hex(raw), revoked_at: null } }
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[auth] failed to revoke refresh token (non-fatal):", err.message);
  }
}

/**
 * Rotate a refresh token: revoke the presented one and issue a fresh one for
 * the same user. Returns the new raw token (null if issuance failed — the old
 * token is already revoked in that case).
 */
async function rotateRefreshToken(raw, user) {
  await revokeRefreshToken(raw);
  return issueRefreshToken(user);
}

const verifyPassword = (password, hash) => {
  // Only bcrypt hashes are accepted (issue #15): SHA256 password hashes are no
  // longer supported for security — any non-bcrypt hash fails closed.
  if (typeof hash === "string" && hash.startsWith("$2")) {
    return bcrypt.compareSync(password, hash);
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
      }
    }

    if (!user) {
      return fail(res, 401, "INVALID_CREDENTIALS", "Invalid username or password", {
        requestId: req.id || null,
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: normalizeRole(role),
        orgId: user.org_id || null,
      },
      env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // ADR-5: dual issuance — also set the JWT as an httpOnly cookie
    // (the body token remains for backward-compatible clients).
    setAuthTokenCookie(res, token);

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

    // Issue a DB-backed refresh token (issue #12). env_admin is a synthetic
    // non-DB account — it gets no refresh token (refreshToken: null).
    let refreshToken = null;
    if (!isEnvAdmin) {
      refreshToken = await issueRefreshToken(user);
    }
    if (refreshToken) {
      setRefreshTokenCookie(res, refreshToken);
    }

    return ok(res, {
      token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: normalizeRole(role),
        orgId: user.org_id || null,
        ...authzData,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Internal server error", { requestId: req.id || null });
  }
};

exports.logout = async (req, res) => {
  // Revoke the presented refresh token (issue #12) so a stolen token cannot be
  // rotated after logout. Body first, then the httpOnly refresh_token cookie.
  const raw = extractRefreshToken(req);
  if (raw) {
    await revokeRefreshToken(raw);
  }
  return ok(res, { message: "Logout successful" });
};

exports.me = async (req, res) => {
  // RBAC v2: Return full authorization data
  const authz = req.authz;

  // ADR-5: mint a fresh token so cookie-only clients (e.g. the web app after
  // a boot restore via the httpOnly auth_token cookie) can re-attach the
  // Bearer header for non-auth routes. Additive — existing clients ignore it.
  const token = jwt.sign(
    {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      orgId: req.user.orgId || null,
    },
    env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  if (!authz) {
    // Fallback to basic user info
    return ok(res, { token, user: req.user });
  }

  return ok(res, {
    token,
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

// ───────────────────────────── Register ─────────────────────────────
exports.register = async (req, res) => {
  try {
    const { username, email, password, orgName } = req.body;

    // Check if username already exists
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return fail(res, 409, "CONFLICT", "Username already exists", { requestId: req.id || null });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return fail(res, 409, "CONFLICT", "Email already exists", { requestId: req.id || null });
    }

    // The org_owner role MUST be seeded before any registration can proceed.
    // Checked BEFORE creating the tenant/user so a misconfigured DB never
    // produces a silently escalated account (the old super_admin/admin
    // fallback is removed by design).
    const orgOwnerRole = await require("../models").Role.findOne({
      where: { name: "org_owner" },
    });
    if (!orgOwnerRole) {
      return fail(
        res,
        503,
        "ROLE_NOT_SEEDED",
        'The "org_owner" role is not seeded. Run the seed script before allowing registrations.',
        { requestId: req.id || null }
      );
    }

    // 1. Create Tenant
    const tenantName = orgName || `${username}'s Org`;
    const tenantSlug = `${username}-org-${Date.now()}`;
    const [tenantResult] = await require("../models").sequelize.query(
      `INSERT INTO tenants (id, name, slug, settings_json, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, '{}'::jsonb, NOW(), NOW())
       RETURNING id;`,
      { bind: [tenantName, tenantSlug] }
    );
    const tenantId = tenantResult[0].id;

    // 2. Create User with org_id
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password_hash: passwordHash,
      role: "org_owner",
      status: "active",
      org_id: tenantId,
    });

    // 3. Create UserIdentity (local provider)
    await require("../models").UserIdentity?.create({
      user_id: user.id,
      provider: "local",
      provider_id: username,
    });

    // 4. Assign org_owner role (verified seeded above)
    await require("../models").UserRole.create({
      user_id: user.id,
      role_id: orgOwnerRole.id,
      org_id: tenantId,
    });

    // 5. Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: "org_owner", orgId: tenantId },
      env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // ADR-5: dual issuance — set the JWT as an httpOnly cookie too.
    setAuthTokenCookie(res, token);

    // Issue a DB-backed refresh token (issue #12).
    const refreshToken = await issueRefreshToken(user);
    if (refreshToken) {
      setRefreshTokenCookie(res, refreshToken);
    }

    return ok(res, {
      token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        orgId: tenantId,
        roleNames: ["org_owner"],
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Internal server error", { requestId: req.id || null });
  }
};

// ───────────────────────────── Invite ─────────────────────────────
exports.invite = async (req, res) => {
  try {
    const { email, roleName } = req.body;
    // orgId comes from the JWT claim (req.user.orgId, now populated by
    // authMiddleware); req.tenantId is the tenant resolved by tenantMiddleware
    // as a fallback. A user without an org cannot invite.
    const orgId = req.user?.orgId || req.tenantId || null;

    if (!orgId) {
      return fail(res, 400, "BAD_REQUEST", "User does not belong to an organization", {
        requestId: req.id || null,
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return fail(res, 409, "CONFLICT", "A user with this email already exists", {
        requestId: req.id || null,
      });
    }

    // Verify the role exists and belongs to this org (or is a system role)
    const role = await require("../models").Role.findOne({
      where: { name: roleName },
    });
    if (!role) {
      return fail(res, 400, "BAD_REQUEST", `Role "${roleName}" not found`, {
        requestId: req.id || null,
      });
    }

    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString("hex");

    // Create user with status='invited'
    const username = email.split("@")[0];
    const user = await User.create({
      username: `${username}_${inviteToken.slice(0, 8)}`,
      email,
      password_hash: crypto.randomBytes(32).toString("hex"),
      role: roleName,
      status: "invited",
      invite_token: inviteToken,
      org_id: orgId,
    });

    // Assign the requested role
    await require("../models").UserRole.create({
      user_id: user.id,
      role_id: role.id,
      org_id: orgId,
    });

    const inviteUrl = `${req.protocol}://${req.get("host")}/accept-invite?token=${inviteToken}`;

    return ok(res, {
      inviteToken,
      inviteUrl,
      user: {
        id: user.id,
        email: user.email,
        roleName,
      },
    });
  } catch (error) {
    console.error("Invite error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Internal server error", { requestId: req.id || null });
  }
};

// ───────────────────────────── Accept Invite ─────────────────────────────
exports.acceptInvite = async (req, res) => {
  try {
    const { token, username, password } = req.body;

    // Find user by invite token
    const user = await User.findOne({ where: { invite_token: token, status: "invited" } });
    if (!user) {
      return fail(res, 400, "INVALID_TOKEN", "Invalid or expired invite token", {
        requestId: req.id || null,
      });
    }

    // Check if new username is available
    const existingUsername = await User.findOne({
      where: { username, id: { [require("sequelize").Op.ne]: user.id } },
    });
    if (existingUsername) {
      return fail(res, 409, "CONFLICT", "Username already taken", {
        requestId: req.id || null,
      });
    }

    // Hash password and activate user
    const passwordHash = await bcrypt.hash(password, 10);
    await user.update({
      username,
      password_hash: passwordHash,
      status: "active",
      invite_token: null,
    });

    // Generate JWT
    const jwtToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        orgId: user.org_id || null,
      },
      env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // ADR-5: dual issuance — also set the JWT as an httpOnly cookie.
    setAuthTokenCookie(res, jwtToken);

    // Issue a DB-backed refresh token (issue #12).
    const refreshToken = await issueRefreshToken(user);
    if (refreshToken) {
      setRefreshTokenCookie(res, refreshToken);
    }

    return ok(res, {
      token: jwtToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        orgId: user.org_id,
        roleNames: [user.role],
      },
    });
  } catch (error) {
    console.error("Accept invite error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Internal server error", { requestId: req.id || null });
  }
};

// ───────────────────────────── Refresh Token ─────────────────────────────
exports.refresh = async (req, res) => {
  try {
    // 1. Credentials: DB-backed refresh token (body first, then the httpOnly
    //    refresh_token cookie — no cookie-parser, parsed manually). The Bearer
    //    JWT (bridged from the auth_token cookie by cookieToBearer) is only
    //    used for the backward-compat fallback and RLS tenant context.
    const raw = extractRefreshToken(req);

    // 2. Re-verify a Bearer JWT if one is present (mirrors authMiddleware's
    //    payload extraction). Non-fatal when absent or invalid — the refresh
    //    token (if any) carries the session on its own.
    let currentUser = null;
    const header = req.headers.authorization || "";
    const bearer = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
    if (bearer) {
      try {
        const payload = jwt.verify(bearer, env.JWT_SECRET);
        currentUser = {
          id: payload.id,
          username: payload.username,
          role: normalizeRole(payload.role),
          orgId: payload.orgId || null,
        };
        if (payload.id === "env_admin") {
          currentUser.role = "super_admin";
        }
      } catch (_) {
        // Invalid/expired JWT — proceed on the refresh token alone.
      }
    }

    // 3. DB-backed rotation path (issue #12): the presented token is
    //    validated, revoked, and replaced with a fresh one + a fresh JWT.
    if (raw) {
      // Establish RLS tenant context from the verified JWT (when present) so
      // the lookup below is visible under the strict RLS policies. Without a
      // JWT and under forced RLS the lookup fails closed → 401.
      if (currentUser) {
        await applyTenantContext(res, {
          tenantId: currentUser.orgId,
          isSuperAdmin: currentUser.id === "env_admin",
        });
      }

      const row = await db.RefreshToken.findOne({
        where: { token_hash: sha256hex(raw) },
        include: [{ model: db.User, as: "user" }],
      });

      const now = Date.now();
      if (!row || row.revoked_at || new Date(row.expires_at).getTime() <= now || !row.user) {
        return fail(res, 401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired", {
          requestId: req.id || null,
        });
      }

      const user = row.user;

      // Re-scope RLS to the token's own org so the revoke+create below pass
      // the WITH CHECK policy even for cookie-only requests (covers the case
      // where the row was reached without a JWT-derived context).
      await applyTenantContext(res, {
        tenantId: row.org_id ?? user.org_id ?? null,
        isSuperAdmin: false,
      });

      // Rotate: revoke the old row, insert a fresh one for the same user.
      const newRaw = await rotateRefreshToken(raw, user);

      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: normalizeRole(user.role),
          orgId: user.org_id || null,
        },
        env.JWT_SECRET,
        { expiresIn: "24h" }
      );
      setAuthTokenCookie(res, token);

      // If the new token could not be persisted the old one is already
      // revoked — hand back a JWT-only response rather than a dead token.
      if (newRaw) {
        setRefreshTokenCookie(res, newRaw);
      }
      return ok(res, {
        token,
        refreshToken: newRaw,
        user: {
          id: user.id,
          username: user.username,
          role: normalizeRole(user.role),
          orgId: user.org_id || null,
        },
      });
    }

    // 4. Backward-compat fallback: no refresh token — refresh the JWT itself
    //    (only when a valid Bearer JWT was presented).
    if (!currentUser) {
      return fail(res, 401, "UNAUTHORIZED", "Not authenticated", {
        requestId: req.id || null,
      });
    }

    const token = jwt.sign(
      {
        id: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
        orgId: currentUser.orgId || null,
      },
      env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // ADR-5: dual issuance — refresh the httpOnly cookie as well.
    setAuthTokenCookie(res, token);

    return ok(res, { token, refreshToken: null });
  } catch (error) {
    console.error("Refresh error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Internal server error", { requestId: req.id || null });
  }
};

// ───────────────────────────── Google OAuth Callback ─────────────────────────────
exports.googleCallback = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(`${env.GOOGLE_CALLBACK_URL || "/login"}?error=auth_failed`);
    }

    const user = req.user;

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role || "viewer",
        orgId: user.orgId || null,
      },
      env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // ADR-5: dual issuance — set the cookie before the redirect so the
    // browser carries the session even if the ?token= URL is stripped.
    setAuthTokenCookie(res, token);

    // Issue a DB-backed refresh token (issue #12) — user.id is a real DB id
    // here, so the row can be persisted alongside the user's org.
    const refreshToken = await issueRefreshToken(user);
    if (refreshToken) {
      setRefreshTokenCookie(res, refreshToken);
    }

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const refreshQuery = refreshToken ? `&refreshToken=${encodeURIComponent(refreshToken)}` : "";
    return res.redirect(`${frontendUrl}/auth/callback?token=${token}${refreshQuery}`);
  } catch (error) {
    console.error("Google callback error:", error);
    return res.redirect("/login?error=internal_error");
  }
};
