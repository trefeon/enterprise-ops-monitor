const env = require("../config/env");

const AUTH_COOKIE_NAME = "auth_token";
// Matches the 24h JWT expiry used across auth endpoints.
const AUTH_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Refresh-token cookie (issue #12): 30-day lifetime, matching the 30-day
// expires_at stored on refresh_tokens rows.
const REFRESH_COOKIE_NAME = "refresh_token";
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * ADR-5 dual issuance: set the JWT as an `auth_token` cookie in addition to
 * returning it in the response body (body token stays for backward-compatible
 * display/agent clients).
 *
 * Security properties:
 *   - httpOnly: the token is never readable from JavaScript (XSS-proof vs
 *     localStorage persistence).
 *   - SameSite=Strict: the cookie is never sent on cross-site requests, so no
 *     CSRF token is required (ADR-5).
 *   - Secure: only set over HTTPS. Development runs over http://localhost, so
 *     the flag is tied to NODE_ENV=production.
 *   - path=/: the cookie is sent on every request, which is what the
 *     cookie-to-Bearer bridge in authRoutes.js relies on for session restore.
 */
function setAuthTokenCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  });
}

/**
 * ADR-5 dual-issuance for refresh tokens (issue #12): store the rotating
 * refresh token in an httpOnly cookie so browsers can refresh without ever
 * exposing the token to JavaScript. Same security posture as the auth cookie:
 * httpOnly + SameSite=Strict + Secure in production.
 */
function setRefreshTokenCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
}

module.exports = {
  setAuthTokenCookie,
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_MAX_AGE_MS,
  setRefreshTokenCookie,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_MAX_AGE_MS,
};
