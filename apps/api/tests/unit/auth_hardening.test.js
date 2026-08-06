const { describe, it, beforeEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// node --test spawns one child process per test file, so the require.cache
// interception below cannot leak into other test files.
process.env.NODE_ENV = "test";

const baseDir = path.resolve(__dirname, "../../");
const SECRET = "test_secret_min_16_chars";

// ── MOCKING INFRASTRUCTURE ────────────────────────────────────────────────
// Same pattern as auth_login_orgid.test.js: populate require.cache so the
// modules under test (authController / authRoutes / passport) see mocks
// instead of a real DB / real env (config/env.js throws without a DB).

const mockEnv = {
  JWT_SECRET: SECRET,
  NODE_ENV: "test",
  ADMIN_USERNAME: "env_admin",
  ADMIN_PASSWORD_HASH: bcrypt.hashSync("envpass", 10),
};

// authController destructures `loadUserAuthz` at load time, so the mock must
// be a delegating function (property reassignment would not be visible).
let loadUserAuthzImpl = async () => null;
const mockAuthzService = {
  loadUserAuthz: (...args) => loadUserAuthzImpl(...args),
};

const mockModels = {
  User: {
    findOne: async () => null,
    create: mock.fn(async () => ({})),
    findByPk: async () => null,
    findOrCreate: mock.fn(async () => []),
  },
  Role: {
    findOne: async () => null,
  },
  UserRole: {
    create: mock.fn(async () => ({})),
  },
  UserIdentity: {
    findOne: async () => null,
    create: async () => ({}),
  },
  RefreshToken: {
    create: mock.fn(async () => ({})),
    findOne: async () => null,
    update: async () => [0],
  },
  sequelize: {
    query: mock.fn(async () => []),
    // issueRefreshToken wraps the INSERT in a tenant-context transaction
    // (issue #12 + strict RLS): provide the transaction plumbing the mock
    // sequelize lacks, with a stub query for the set_config call.
    transaction: mock.fn(async (callback) =>
      callback({ sequelize: { query: mock.fn(async () => []) } })
    ),
  },
  Sequelize: {},
};

// authMiddleware calls setOrgId() for DB users with an orgId claim (Slice 4);
// mock dataClient so the /me cookie flow stays DB-free and quiet.
const mockDataClient = {
  setOrgId: async () => {},
};

const abs = (rel) => path.join(baseDir, rel);

function installMocks() {
  const entries = {
    "models/index.js": mockModels,
    "config/env.js": mockEnv,
    "services/authzService.js": mockAuthzService,
    "services/dataClient.js": mockDataClient,
  };
  for (const [rel, exportsVal] of Object.entries(entries)) {
    const absPath = abs(rel);
    require.cache[absPath] = { id: absPath, filename: absPath, loaded: true, exports: exportsVal };
  }
}

installMocks();

// ── Fresh authRoutes app per call ─────────────────────────────────────────
// Each build busts the authRoutes module cache so the in-memory
// registerLimiter is fresh (express-rate-limit stores are per-module).

function buildAuthApp() {
  delete require.cache[require.resolve("../../routes/authRoutes")];
  const authRoutes = require("../../routes/authRoutes");
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  return app;
}

const VALID_REGISTER_BODY = {
  username: "newuser",
  email: "new@acme.com",
  password: "Str0ng!Pass",
  orgName: "Acme Org",
};

// ── Google strategy harness ───────────────────────────────────────────────
// passport-google-oauth20 is swapped for a fake Strategy that captures the
// verify callback so tests can drive it directly (no OAuth round-trip).

const googleStrategyModulePath = require.resolve("passport-google-oauth20");

let capturedGoogleVerify = null;
const FakeGoogleStrategy = class {
  constructor(options, verify) {
    this.options = options;
    this.name = "google"; // passport.use() requires strategies to have a name
    this.verify = verify;
    capturedGoogleVerify = verify; // capture for direct invocation in tests
  }
};

function installFakeGoogleStrategyModule() {
  capturedGoogleVerify = null;
  require.cache[googleStrategyModulePath] = {
    id: googleStrategyModulePath,
    filename: googleStrategyModulePath,
    loaded: true,
    exports: { Strategy: FakeGoogleStrategy },
  };
}

function reRequirePassport() {
  const passportPath = require.resolve("../../middleware/passport");
  delete require.cache[passportPath];
  return require("../../middleware/passport");
}

function deleteGoogleStrategyFromPassport() {
  // The passport package is a singleton shared across re-requires of
  // middleware/passport.js — clean the accumulated google strategy so the
  // "not registered" test sees a truly clean passport.
  const passport = require("passport");
  if (passport._strategies) {
    delete passport._strategies.google;
  }
}

function driveVerify(profile, done) {
  return capturedGoogleVerify({}, "accessToken", "refreshToken", profile, done);
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("authRoutes register limiter", () => {
  it("blocks the 11th rapid registration with a 429 TOO_MANY_REQUESTS envelope", async () => {
    const app = buildAuthApp();

    for (let i = 0; i < 10; i += 1) {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ ...VALID_REGISTER_BODY, username: `user${i}` });
      // Mock Role.findOne returns null → controller answers ROLE_NOT_SEEDED.
      // The limiter must let these through and only trip on request #11.
      assert.equal(res.status, 503, `request ${i + 1} should reach the controller`);
    }

    const blocked = await request(app).post("/api/auth/register").send(VALID_REGISTER_BODY);
    assert.equal(blocked.status, 429, "11th request must be rate-limited");
    assert.equal(blocked.body.ok, false);
    assert.equal(blocked.body.error.code, "TOO_MANY_REQUESTS");
    assert.match(blocked.body.error.message, /15 minutes/i);
  });

  it("a fresh app instance has a fresh limiter window", async () => {
    const app = buildAuthApp();
    const res = await request(app).post("/api/auth/register").send(VALID_REGISTER_BODY);
    assert.notEqual(res.status, 429, "first request on a fresh limiter must not be throttled");
  });
});

describe("authController.register — no super_admin fallback", () => {
  beforeEach(() => {
    mockModels.User.findOne = async () => null;
    mockModels.Role.findOne = async () => null;
    mockModels.User.create.mock.resetCalls();
    mockModels.UserRole.create.mock.resetCalls();
    mockModels.sequelize.query.mock.resetCalls();
  });

  it("returns 503 ROLE_NOT_SEEDED and creates NOTHING when org_owner is missing", async () => {
    const app = buildAuthApp();
    const res = await request(app).post("/api/auth/register").send(VALID_REGISTER_BODY);

    assert.equal(res.status, 503);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.error.code, "ROLE_NOT_SEEDED");
    assert.match(
      res.body.error.message,
      /seed/i,
      "message should point the operator at the seed script"
    );
    assert.equal(mockModels.User.create.mock.callCount(), 0, "user must NOT be created");
    assert.equal(
      mockModels.sequelize.query.mock.callCount(),
      0,
      "tenant must NOT be created before the role check"
    );
    assert.equal(
      mockModels.UserRole.create.mock.callCount(),
      0,
      "no role must be assigned when org_owner is missing"
    );
  });

  it("only consults the org_owner role — never falls back to super_admin/admin", async () => {
    const queriedRoles = [];
    mockModels.Role.findOne = async ({ where }) => {
      queriedRoles.push(where.name);
      return null;
    };

    const app = buildAuthApp();
    await request(app).post("/api/auth/register").send(VALID_REGISTER_BODY);

    assert.deepEqual(queriedRoles, ["org_owner"]);
  });

  it("succeeds when org_owner is seeded and issues the auth_token cookie", async () => {
    const TENANT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    mockModels.Role.findOne = async ({ where }) =>
      where.name === "org_owner" ? { id: 7, name: "org_owner" } : null;
    mockModels.sequelize.query = mock.fn(async () => [[{ id: TENANT_ID }]]);
    mockModels.User.create = mock.fn(async (args) => ({
      id: "u-1",
      username: args.username,
      email: args.email,
    }));

    const app = buildAuthApp();
    const res = await request(app).post("/api/auth/register").send(VALID_REGISTER_BODY);

    assert.equal(res.status, 200, "register should succeed when the role is seeded");
    assert.ok(res.body.data.token, "token must remain in the body (backward compat)");

    const cookieHeader = (res.headers["set-cookie"] || []).find((c) => c.startsWith("auth_token="));
    assert.ok(cookieHeader, "auth_token Set-Cookie must be issued");
    assert.match(cookieHeader, /HttpOnly/i);
    assert.match(cookieHeader, /SameSite=Strict/i);
  });
});

describe("ADR-5 cookie issuance (login) + cookie-to-Bearer bridge", () => {
  beforeEach(() => {
    mockModels.User.findOne = async () => null;
    loadUserAuthzImpl = async () => null;
  });

  it("login sets auth_token cookie (HttpOnly, SameSite=Strict, 24h) and keeps the body token", async () => {
    mockModels.User.findOne = async ({ where }) =>
      where.username === "alice"
        ? {
            id: "u-1",
            username: "alice",
            org_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            password_hash: bcrypt.hashSync("s3cret!Pass", 10),
            role: "viewer",
            update: async () => {},
          }
        : null;
    loadUserAuthzImpl = async () => ({
      roleNames: ["viewer"],
      effectivePerms: [],
      scopeBranches: [],
      isAllBranches: false,
    });

    const app = buildAuthApp();
    const res = await request(app).post("/api/auth/login").send({
      username: "alice",
      password: "s3cret!Pass",
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.token, "body token must still be present (backward compat)");
    assert.ok(
      res.body.data.refreshToken,
      "login for a DB user must issue a refresh token (issue #12)"
    );

    const cookieHeader = (res.headers["set-cookie"] || []).find((c) => c.startsWith("auth_token="));
    assert.ok(cookieHeader, "auth_token cookie must be set");
    assert.match(cookieHeader, /HttpOnly/i);
    assert.match(cookieHeader, /SameSite=Strict/i);
    assert.match(cookieHeader, /Path=\//i);
    assert.match(cookieHeader, /Max-Age=86400/i, "cookie lives 24h like the JWT");

    const refreshCookie = (res.headers["set-cookie"] || []).find((c) =>
      c.startsWith("refresh_token=")
    );
    assert.ok(refreshCookie, "refresh_token cookie must be set alongside the JWT");
    assert.match(refreshCookie, /HttpOnly/i);
    assert.match(refreshCookie, /SameSite=Strict/i);
    assert.match(refreshCookie, /Path=\//i);
  });

  it("/me restores the session from the auth_token cookie alone (no Bearer header)", async () => {
    loadUserAuthzImpl = async () => ({
      roleNames: ["admin"],
      effectivePerms: ["*"],
      scopeBranches: [],
      isAllBranches: true,
    });
    const cookie = jwt.sign(
      {
        id: "u-9",
        username: "bob",
        role: "admin",
        orgId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      },
      SECRET,
      { expiresIn: "24h" }
    );

    const app = buildAuthApp();
    const res = await request(app).get("/api/auth/me").set("Cookie", `auth_token=${cookie}`);

    assert.equal(res.status, 200, "cookie-only request must be able to restore the session");
    assert.ok(res.body.data.token, "me should mint a fresh token for the client");
    assert.equal(res.body.data.user.username, "bob");
  });

  it("me without token or cookie is rejected with 401", async () => {
    const app = buildAuthApp();
    const res = await request(app).get("/api/auth/me");
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, "UNAUTHORIZED");
  });
});

describe("google strategy registration guard + auto-register allowlist", () => {
  beforeEach(() => {
    delete mockEnv.GOOGLE_CLIENT_ID;
    delete mockEnv.GOOGLE_CLIENT_SECRET;
    delete mockEnv.GOOGLE_AUTO_REGISTER;
    delete mockEnv.GOOGLE_ALLOWED_DOMAINS;
    capturedGoogleVerify = null;
    deleteGoogleStrategyFromPassport();
    mockModels.UserIdentity.findOne = async () => null;
    mockModels.User.findOrCreate.mock.resetCalls();
  });

  it("registers NO google strategy when creds are unset", () => {
    installFakeGoogleStrategyModule(); // must NOT be consumed without creds
    const passportInstance = reRequirePassport();

    assert.equal(passportInstance._strategies.google, undefined);
    assert.equal(capturedGoogleVerify, null, "verify must never be constructed");
  });

  it("registers the google strategy when both creds are set", () => {
    mockEnv.GOOGLE_CLIENT_ID = "cid";
    mockEnv.GOOGLE_CLIENT_SECRET = "csecret";
    installFakeGoogleStrategyModule();
    const passportInstance = reRequirePassport();

    assert.ok(passportInstance._strategies.google, "google strategy must be registered");
    assert.ok(capturedGoogleVerify, "verify callback must be captured");
  });

  it("auto-register from a disallowed domain creates no user (domain_not_allowed)", async () => {
    mockEnv.GOOGLE_CLIENT_ID = "cid";
    mockEnv.GOOGLE_CLIENT_SECRET = "csecret";
    mockEnv.GOOGLE_AUTO_REGISTER = "true";
    mockEnv.GOOGLE_ALLOWED_DOMAINS = "acme.com,corp.example";
    installFakeGoogleStrategyModule();
    reRequirePassport();

    const outcome = await new Promise((resolve) => {
      driveVerify({ id: "g-1", emails: [{ value: "hacker@evil.com" }] }, (err, user, info) =>
        resolve({ err, user, info })
      );
    });

    assert.equal(outcome.err, null);
    assert.equal(outcome.user, false, "auth attempt must fail");
    assert.equal(outcome.info.message, "domain_not_allowed");
    assert.equal(
      mockModels.User.findOrCreate.mock.callCount(),
      0,
      "user must NOT be auto-created for a disallowed domain"
    );
  });

  it("auto-register fails closed when GOOGLE_ALLOWED_DOMAINS is unset", async () => {
    mockEnv.GOOGLE_CLIENT_ID = "cid";
    mockEnv.GOOGLE_CLIENT_SECRET = "csecret";
    mockEnv.GOOGLE_AUTO_REGISTER = "true";
    // GOOGLE_ALLOWED_DOMAINS intentionally NOT set
    installFakeGoogleStrategyModule();
    reRequirePassport();

    const outcome = await new Promise((resolve) => {
      driveVerify({ id: "g-2", emails: [{ value: "admin@acme.com" }] }, (err, user, info) =>
        resolve({ err, user, info })
      );
    });

    assert.equal(outcome.user, false, "must not auto-register with an empty allowlist");
    assert.equal(
      mockModels.User.findOrCreate.mock.callCount(),
      0,
      "no user created when the allowlist is missing"
    );
  });

  it("auto-register succeeds for an allowlisted domain", async () => {
    mockEnv.GOOGLE_CLIENT_ID = "cid";
    mockEnv.GOOGLE_CLIENT_SECRET = "csecret";
    mockEnv.GOOGLE_AUTO_REGISTER = "true";
    mockEnv.GOOGLE_ALLOWED_DOMAINS = "acme.com";
    mockModels.User.findOrCreate = mock.fn(async () => [
      { id: "u-99", username: "admin", orgId: null },
      true,
    ]);
    loadUserAuthzImpl = async () => ({
      roleNames: ["viewer"],
      effectivePerms: [],
      scopeBranches: [],
      isAllBranches: false,
    });
    installFakeGoogleStrategyModule();
    reRequirePassport();

    const outcome = await new Promise((resolve) => {
      driveVerify({ id: "g-3", emails: [{ value: "admin@acme.com" }] }, (err, user, info) =>
        resolve({ err, user, info })
      );
    });

    assert.equal(outcome.err, null);
    assert.ok(outcome.user, "allowlisted domain should auto-register");
    assert.equal(outcome.user.id, "u-99");
    assert.equal(mockModels.User.findOrCreate.mock.callCount(), 1);
  });
});
