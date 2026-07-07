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
      const crypto = require("crypto");

      // Check env admin first
      if (env.ADMIN_USERNAME && username === env.ADMIN_USERNAME) {
        const hash = env.ADMIN_PASSWORD_HASH;
        let valid = false;
        if (hash.startsWith("$2")) {
          valid = bcrypt.compareSync(password, hash);
        } else if (hash.length === 64) {
          const sha256 = crypto.createHash("sha256").update(password).digest("hex");
          valid = crypto.timingSafeEqual(Buffer.from(sha256), Buffer.from(hash));
        }
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

      let valid = false;
      if (user.password_hash.startsWith("$2")) {
        valid = bcrypt.compareSync(password, user.password_hash);
      } else if (user.password_hash.length === 64) {
        const sha256 = crypto.createHash("sha256").update(password).digest("hex");
        valid = crypto.timingSafeEqual(Buffer.from(sha256), Buffer.from(user.password_hash));
      }

      if (!valid) {
        return done(null, false, { message: "Invalid credentials" });
      }

      // Migrate legacy hash if needed
      if (!user.password_hash.startsWith("$2")) {
        try {
          const newHash = await bcrypt.hash(password, 10);
          await user.update({ password_hash: newHash });
        } catch (_) {
          // non-fatal
        }
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

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  const GoogleStrategy = require("passport-google-oauth20").Strategy;

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
        passReqToCallback: true,
        state: true, // CSRF protection via OAuth state parameter
      },
      async (_accessToken, _refreshToken, profile, done) => {
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

          // Auto-register if enabled
          if (env.GOOGLE_AUTO_REGISTER) {
            const email = profile.emails?.[0]?.value;
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
      return done(null, { id: "env_admin", username: "env_admin", role: "super_admin", orgId: null });
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
