/**
 * Passport.js configuration.
 *
 * Strategies:
 *   - JWT strategy (primary): extracts Bearer token from Authorization header
 *   - Local strategy (fallback): username/password login
 *   - Google OAuth 2.0 strategy (optional): social login
 */
const passport = require("passport");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const { Strategy: LocalStrategy } = require("passport-local");

const db = require("../models");
const env = require("../config/env");
const { normalizeRole } = require("../utils/roleMap");
const { loadUserAuthz } = require("../services/authzService");
const { ALL_PERMISSIONS } = require("../lib/permissions");

// ───────────────────────────── JWT Strategy ─────────────────────────────

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: env.JWT_SECRET,
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      // Special handling for env_admin
      if (payload.id === "env_admin") {
        const authz = {
          userId: "env_admin",
          roleNames: ["super_admin"],
          rolePerms: ALL_PERMISSIONS,
          overridesAllow: [],
          overridesDeny: [],
          effectivePerms: ALL_PERMISSIONS,
          scopeBranches: [],
          isAllBranches: true,
        };
        return done(null, {
          id: payload.id,
          username: payload.username,
          role: "super_admin",
          orgId: payload.orgId || null,
          authz,
        });
      }

      // Load full authz context for DB users
      const authz = await loadUserAuthz(payload.id);
      if (!authz) {
        return done(null, false, { message: "User not found" });
      }

      const user = {
        id: payload.id,
        username: payload.username,
        role: authz.roleNames.length > 0 ? authz.roleNames[0] : normalizeRole(payload.role),
        orgId: payload.orgId || authz.orgId || null,
        authz,
      };

      return done(null, user);
    } catch (err) {
      return done(err, false);
    }
  })
);

// ───────────────────────────── Local Strategy ─────────────────────────────

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const bcrypt = require("bcryptjs");

      // Check env admin first. Only bcrypt hashes are accepted (issue #15 —
      // SHA256 password support was removed); anything else fails closed.
      if (env.ADMIN_USERNAME && username === env.ADMIN_USERNAME) {
        const hash = env.ADMIN_PASSWORD_HASH;
        const valid =
          typeof hash === "string" && hash.startsWith("$2") && bcrypt.compareSync(password, hash);
        if (valid) {
          return done(null, {
            id: "env_admin",
            username: env.ADMIN_USERNAME,
            role: "super_admin",
            orgId: null,
          });
        }
      }

      // Check database user
      const user = await db.User.findOne({ where: { username } });
      if (!user) {
        return done(null, false, { message: "Invalid credentials" });
      }

      // Only bcrypt hashes are accepted (issue #15); SHA256 legacy hashes no
      // longer verify and are rejected without a timing side-channel.
      let valid = false;
      if (typeof user.password_hash === "string" && user.password_hash.startsWith("$2")) {
        valid = bcrypt.compareSync(password, user.password_hash);
      }

      if (!valid) {
        return done(null, false, { message: "Invalid credentials" });
      }

      return done(null, {
        id: user.id,
        username: user.username,
        role: normalizeRole(user.role),
        orgId: user.orgId || null,
      });
    } catch (err) {
      return done(err);
    }
  })
);

// ───────────────────────────── Google OAuth 2.0 Strategy ─────────────────────────────
// Registered ONLY when Google credentials are configured. Without creds the
// strategy is never registered, so passport.authenticate("google") fails
// gracefully via the GOOGLE_NOT_CONFIGURED guard in authRoutes.js instead of
// a 500 "Unknown authentication strategy".

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  const GoogleStrategy = require("passport-google-oauth20").Strategy;

  // Fail-closed auto-register allowlist (Slice 6): auto-registration is only
  // permitted for emails whose domain is listed in GOOGLE_ALLOWED_DOMAINS
  // (comma-separated). If GOOGLE_AUTO_REGISTER is enabled but the allowlist
  // is unset/empty, auto-registration stays disabled — an unseeded or
  // misconfigured allowlist never opens the door to arbitrary sign-ups.
  const allowedDomains = String(env.GOOGLE_ALLOWED_DOMAINS || "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  const autoRegisterEnabled = Boolean(env.GOOGLE_AUTO_REGISTER);
  if (autoRegisterEnabled && allowedDomains.length === 0) {
    // eslint-disable-next-line no-console
    console.warn(
      "[passport] GOOGLE_AUTO_REGISTER is enabled but GOOGLE_ALLOWED_DOMAINS is not set — " +
        "Google auto-registration is DISABLED (fail closed)."
    );
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
        passReqToCallback: true,
        // OAuth `state` is now a stateless HMAC-signed payload (utils/oauthState.js,
        // issue #5): authRoutes.js signs it on GET /google and verifies it on the
        // callback BEFORE passport.authenticate runs. `state: false` keeps the
        // strategy's session-based state store disabled — the app is deliberately
        // session-less, so state validation lives in our own middleware instead.
        state: false,
      },
      // NOTE: passReqToCallback shifts the argument order — (req, accessToken,
      // refreshToken, profile, done). The pre-fix signature (no req) silently
      // misaligned profile/done and made the whole Google flow throw.
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          // Look for existing user_identity
          const identity = await db.UserIdentity?.findOne({
            where: { provider: "google", provider_id: profile.id },
            include: [{ model: db.User, as: "user" }],
          });

          if (identity && identity.user) {
            const authz = await loadUserAuthz(identity.user.id);
            return done(null, {
              id: identity.user.id,
              username: identity.user.username,
              role: authz?.roleNames?.[0] || "viewer",
              orgId: identity.user.orgId || null,
              authz: authz || null,
            });
          }

          // Auto-register if enabled AND the email domain is allowlisted.
          if (autoRegisterEnabled) {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              // No email to verify the domain against — fail closed.
              return done(null, false, { message: "no_email_in_profile" });
            }
            const domain = email.split("@")[1]?.toLowerCase() || "";
            if (!allowedDomains.includes(domain)) {
              // Domain not allowlisted — never create the user.
              return done(null, false, { message: "domain_not_allowed" });
            }

            const username = email ? email.split("@")[0] : `google_${profile.id}`;
            const [user, created] = await db.User.findOrCreate({
              where: { username },
              defaults: {
                username,
                password_hash: require("crypto").randomBytes(32).toString("hex"),
                role: "viewer",
              },
            });

            if (created) {
              // Link identity
              await db.UserIdentity?.create({
                user_id: user.id,
                provider: "google",
                provider_id: profile.id,
              });
            }

            const authz = await loadUserAuthz(user.id);
            return done(null, {
              id: user.id,
              username: user.username,
              role: authz?.roleNames?.[0] || "viewer",
              orgId: user.orgId || null,
              authz: authz || null,
            });
          }

          return done(null, false, { message: "Account not linked" });
        } catch (err) {
          return done(err, false);
        }
      }
    )
  );
}

// ───────────────────────────── Serialization ─────────────────────────────
// Minimal serialization — we store everything in JWT, not sessions

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    if (id === "env_admin") {
      return done(null, {
        id: "env_admin",
        username: "env_admin",
        role: "super_admin",
        orgId: null,
      });
    }
    const user = await db.User.findByPk(id, { attributes: ["id", "username", "role", "org_id"] });
    if (!user) return done(null, false);
    return done(null, {
      id: user.id,
      username: user.username,
      role: normalizeRole(user.role),
      orgId: user.org_id || null,
    });
  } catch (err) {
    return done(err);
  }
});

module.exports = passport;
// WAVE A COMPLETE — passport.js
