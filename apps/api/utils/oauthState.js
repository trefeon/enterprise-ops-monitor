/**
 * Stateless HMAC-signed OAuth `state` (issue #5).
 *
 * The app is deliberately session-less (no express-session), so the OAuth
 * `state` parameter cannot be stored server-side. Instead we sign it:
 *
 *   state = base64url(JSON payload) . base64url(HMAC-SHA256(payload, JWT_SECRET))
 *   payload = { n: <random nonce>, exp: <Date.now() + 10min> }
 *
 * Verification is done in authRoutes.js BEFORE passport.authenticate runs on
 * the Google callback — a callback whose `state` does not verify (missing,
 * tampered, expired, or forged) is redirected to /login?error=invalid_oauth_state.
 *
 * This binds the authorization request to the callback (CSRF protection for
 * the OAuth flow) without any server-side state.
 */
const crypto = require("crypto");
const env = require("../config/env");

// 10 minutes: long enough for the user to complete the Google consent screen,
// short enough to bound replay of an intercepted authorization URL.
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function buildState(exp) {
  const payload = JSON.stringify({
    n: crypto.randomBytes(16).toString("hex"),
    exp,
  });
  const hmac = crypto.createHmac("sha256", env.JWT_SECRET).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${hmac}`;
}

/**
 * Sign a fresh OAuth state valid for 10 minutes.
 * @returns {string} `base64url(payload).base64url(hmac)`
 */
function signOAuthState() {
  return buildState(Date.now() + OAUTH_STATE_TTL_MS);
}

/**
 * Test-only export: craft a state with an arbitrary expiry (used by
 * tests/oauth_state.test.js to prove expired states are rejected without
 * waiting 10 minutes).
 * @param {number} exp - epoch milliseconds the state should expire at
 * @returns {string}
 */
function signOAuthStateWithExp(exp) {
  return buildState(exp);
}

/**
 * Verify an OAuth state string.
 * @param {unknown} state
 * @returns {boolean} true iff format is valid, the HMAC matches (timing-safe),
 *   and the payload has not expired.
 */
function verifyOAuthState(state) {
  if (typeof state !== "string") return false;
  const parts = state.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, hmacB64] = parts;

  let payload;
  try {
    payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return false;
  }

  const expected = crypto.createHmac("sha256", env.JWT_SECRET).update(payload).digest("base64url");

  // Timing-safe comparison — guard the length mismatch first because
  // crypto.timingSafeEqual throws when the buffer lengths differ.
  const actualBuf = Buffer.from(hmacB64);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) return false;
  if (!crypto.timingSafeEqual(actualBuf, expectedBuf)) return false;

  try {
    const parsed = JSON.parse(payload);
    if (!parsed || typeof parsed.exp !== "number") return false;
    return parsed.exp > Date.now();
  } catch {
    return false;
  }
}

module.exports = { signOAuthState, signOAuthStateWithExp, verifyOAuthState, OAUTH_STATE_TTL_MS };
