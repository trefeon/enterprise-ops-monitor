const test = require("node:test");
const assert = require("node:assert/strict");

// utils/oauthState.js requires config/env.js, which parses process.env at
// load time and throws without JWT_SECRET + DB config — set them first.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_min_16_chars";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/testdb";

const { signOAuthState, signOAuthStateWithExp, verifyOAuthState } = require("../utils/oauthState");

test("sign → verify roundtrip returns true", () => {
  const state = signOAuthState();
  assert.equal(typeof state, "string");
  assert.equal(state.split(".").length, 2, "state must be base64url(payload).base64url(hmac)");
  assert.equal(verifyOAuthState(state), true);
});

test("each state carries a fresh nonce (two states differ)", () => {
  assert.notEqual(signOAuthState(), signOAuthState());
});

test("tampered payload is rejected", () => {
  const state = signOAuthState();
  const [payload, hmac] = state.split(".");
  // Flip one character in the payload base64 without touching the HMAC.
  const tamperedPayload = payload.slice(0, -1) + (payload.endsWith("A") ? "B" : "A");
  assert.equal(verifyOAuthState(`${tamperedPayload}.${hmac}`), false);
});

test("tampered HMAC is rejected", () => {
  const state = signOAuthState();
  const [payload, hmac] = state.split(".");
  const tamperedHmac = hmac.slice(0, -1) + (hmac.endsWith("A") ? "B" : "A");
  assert.equal(verifyOAuthState(`${payload}.${tamperedHmac}`), false);
});

test("expired state is rejected", () => {
  const expired = signOAuthStateWithExp(Date.now() - 1000); // 1s in the past
  assert.equal(verifyOAuthState(expired), false);
});

test("a state near expiry is still valid while unexpired", () => {
  const aboutToExpire = signOAuthStateWithExp(Date.now() + 60_000);
  assert.equal(verifyOAuthState(aboutToExpire), true);
});

test("malformed states are rejected", () => {
  assert.equal(verifyOAuthState(undefined), false);
  assert.equal(verifyOAuthState(null), false);
  assert.equal(verifyOAuthState(""), false);
  assert.equal(verifyOAuthState("no-dot-separator"), false);
  assert.equal(verifyOAuthState("a.b.c"), false);
  assert.equal(verifyOAuthState("!!!.???"), false);
  assert.equal(verifyOAuthState(42), false);
  assert.equal(verifyOAuthState({}), false);
});

test("truncated / garbage HMAC parts are rejected", () => {
  const state = signOAuthState();
  const [payload] = state.split(".");
  assert.equal(verifyOAuthState(`${payload}.`), false);
  assert.equal(verifyOAuthState(`${payload}.abcd`), false);
  assert.equal(verifyOAuthState(`${payload}.${"A".repeat(43)}`), false);
});
