const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const passport = require("passport");
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const { fail } = require("../utils/response");
const env = require("../config/env");
const { passwordSchema } = require("../utils/validators");
const { signOAuthState, verifyOAuthState } = require("../utils/oauthState");

// Security: Strict rate limiter for login to prevent brute force.
// Production limit: 10 attempts per 15 minutes.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  message: {
    ok: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many login attempts, please try again after 15 minutes",
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-Limit-Limit-*` headers
});

// Security: rate limit for public registrations to prevent account spam.
// 10 registrations per IP per 15 minutes (same envelope style as loginLimiter).
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    ok: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many registration attempts, please try again after 15 minutes",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ADR-5 session restore: bridge the httpOnly `auth_token` cookie into the
// Bearer header that authMiddleware expects, so a browser that still carries
// the cookie can restore its session via /me and /refresh without any token
// in localStorage. The app is deliberately session-less (no express-session,
// per ARCHITECTURE.md); SameSite=Strict + httpOnly keep this safe.
function cookieToBearer(req, _res, next) {
  if (req.headers.authorization) {
    return next();
  }
  const cookieHeader = req.headers.cookie || "";
  const authCookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("auth_token="));
  if (authCookie) {
    const raw = authCookie.slice("auth_token=".length);
    try {
      req.headers.authorization = `Bearer ${decodeURIComponent(raw)}`;
    } catch {
      // Malformed cookie value — leave the header unset; auth will 401.
    }
  }
  return next();
}

router.use(cookieToBearer);

/**
 * Manual refresh_token cookie extraction (issue #12). The app has no
 * cookie-parser — mirror the cookieToBearer pattern above: split the Cookie
 * header and pull the `refresh_token=` value. Returns null when absent or
 * malformed.
 */
function refreshTokenFromCookie(req) {
  const cookieHeader = req.headers.cookie || "";
  const part = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith("refresh_token="));
  if (!part) return null;
  try {
    const raw = decodeURIComponent(part.slice("refresh_token=".length));
    return raw || null;
  } catch {
    // Malformed cookie value — treat as absent; auth will 401.
    return null;
  }
}

const loginBody = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const registerBody = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  orgName: z.string().max(255).optional(),
});

const inviteBody = z.object({
  email: z.string().email("Invalid email address"),
  roleName: z.string().min(1, "Role name is required"),
});

const acceptInviteBody = z.object({
  token: z.string().min(1, "Invite token is required"),
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: passwordSchema,
});

const changePasswordBody = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});
const emptyQuery = z.object({}).passthrough();
const emptyBody = z.object({}).passthrough().optional().default({});

router.post(
  "/login",
  loginLimiter,
  validate({ body: loginBody }),
  asyncHandler(authController.login)
);
router.post(
  "/register",
  registerLimiter,
  validate({ body: registerBody }),
  asyncHandler(authController.register)
);
router.post(
  "/invite",
  authMiddleware,
  validate({ body: inviteBody }),
  asyncHandler(authController.invite)
);
router.post(
  "/accept-invite",
  validate({ body: acceptInviteBody }),
  asyncHandler(authController.acceptInvite)
);
// /refresh intentionally runs WITHOUT authMiddleware (issue #12): the DB-backed
// refresh token from the body or the httpOnly refresh_token cookie is the
// primary credential. The controller itself re-verifies a Bearer JWT (bridged
// from the auth_token cookie by cookieToBearer above) for the backward-compat
// JWT-refresh fallback path.
const refreshBody = z.object({ refreshToken: z.string().optional() }).passthrough().default({});

router.post(
  "/refresh",
  validate({ body: refreshBody }),
  (req, _res, next) => {
    // Cookie fallback: if the body carried no refreshToken, adopt the one from
    // the httpOnly refresh_token cookie (manual parse — no cookie-parser).
    if (!req.body.refreshToken) {
      req.body.refreshToken = refreshTokenFromCookie(req);
    }
    return next();
  },
  asyncHandler(authController.refresh)
);
router.post(
  "/logout",
  authMiddleware,
  validate({ body: emptyBody }),
  asyncHandler(authController.logout)
);
router.get("/me", authMiddleware, validate({ query: emptyQuery }), asyncHandler(authController.me));
router.patch(
  "/me/password",
  authMiddleware,
  validate({ body: changePasswordBody }),
  asyncHandler(authController.changePassword)
);
// ── Google OAuth ─────────────────────────────────────────────
// The Google strategy is only registered when GOOGLE_CLIENT_ID and
// GOOGLE_CLIENT_SECRET are both set (see middleware/passport.js). Without
// creds, passport.authenticate("google") would 500 with "Unknown
// authentication strategy", so fail gracefully with a clear envelope instead.

const googleConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

function googleNotConfigured(_req, res, next) {
  if (googleConfigured) return next();
  return fail(res, 503, "GOOGLE_NOT_CONFIGURED", "Google OAuth is not configured on this server");
}

router.get("/google", googleNotConfigured, (req, res, next) => {
  // Stateless HMAC-signed OAuth state (issue #5): the value sent to Google is
  // verified on the callback before passport.authenticate runs. No
  // express-session storage is involved.
  const state = signOAuthState();
  passport.authenticate("google", {
    scope: ["profile", "email"],
    state,
    session: false,
  })(req, res, next);
});

router.get(
  "/google/callback",
  googleNotConfigured,
  (req, res, next) => {
    // OAuth state validation MUST happen before passport.authenticate: the
    // state returned by Google must be one we signed (HMAC + expiry check), or
    // the callback is a forged/CSRF attempt — redirect instead of proceeding.
    if (!verifyOAuthState(req.query.state)) {
      return res.redirect("/login?error=invalid_oauth_state");
    }
    return next();
  },
  (req, res, next) => {
    passport.authenticate("google", { session: false }, (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        // Surface the strategy's failure reason (e.g. domain_not_allowed)
        // instead of a generic google_auth_failed redirect.
        const reason = (info && info.message) || "google_auth_failed";
        return res.redirect(`/login?error=${encodeURIComponent(reason)}`);
      }
      req.user = user;
      return next();
    })(req, res, next);
  },
  asyncHandler(authController.googleCallback)
);

module.exports = router;
