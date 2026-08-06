const { beforeEach, mock, test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const request = require("supertest");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_min_16_chars";

const baseDir = path.resolve(__dirname, "../../");

// ---- Module mocks (same require.cache pattern as media_upload_org.test.js) ----
// authMiddleware is replaced so the route chain can be exercised without a DB
// user lookup; eodController is replaced so we can prove the chain reaches the
// handler (it would otherwise need Postgres).
const authState = { user: null, authz: null };
const authMock = mock.fn(async (req, res, next) => {
  if (!authState.user) {
    return res.status(401).json({
      ok: false,
      data: null,
      meta: null,
      error: { code: "UNAUTHORIZED", message: "Missing Authorization bearer token" },
    });
  }
  req.user = authState.user;
  req.authz = authState.authz;
  next();
});

const eodControllerMock = {
  getLiveEodRanking: mock.fn(async (req, res) =>
    res.status(200).json({ ok: true, data: { ranking: [] }, meta: null, error: null })
  ),
};

const mockModules = {
  [path.join(baseDir, "middleware/authMiddleware.js")]: authMock,
  [path.join(baseDir, "controllers/eodController.js")]: eodControllerMock,
};

Object.entries(mockModules).forEach(([absPath, exports]) => {
  require.cache[absPath] = { id: absPath, filename: absPath, loaded: true, exports };
});

const express = require("express");
const eodRoutes = require("../../routes/eodRoutes");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/eod", eodRoutes);
  return app;
}

const app = buildApp();

const ORG_UUID = "11111111-1111-4111-8111-111111111111";

function makeAuthz(effectivePerms, overrides = {}) {
  return {
    userId: "user-1",
    roleNames: ["viewer"],
    rolePerms: effectivePerms,
    effectivePerms,
    overridesAllow: [],
    overridesDeny: [],
    scopeBranches: [],
    isAllBranches: false,
    ...overrides,
  };
}

beforeEach(() => {
  authState.user = null;
  authState.authz = null;
  authMock.mock.resetCalls();
  eodControllerMock.getLiveEodRanking.mock.resetCalls();
});

test("GET /api/eod/live returns 401 without a token", async () => {
  const res = await request(app).get("/api/eod/live");

  assert.equal(res.status, 401);
  assert.equal(res.body.ok, false);
  assert.equal(res.body.error.code, "UNAUTHORIZED");
  assert.equal(eodControllerMock.getLiveEodRanking.mock.calls.length, 0);
});

test("GET /api/eod/live returns 403 without the EOD_VIEW permission", async () => {
  authState.user = { id: "user-1", username: "alice", role: "viewer", orgId: ORG_UUID };
  authState.authz = makeAuthz([]);

  const res = await request(app).get("/api/eod/live").set("Authorization", "Bearer token");

  assert.equal(res.status, 403);
  assert.equal(res.body.ok, false);
  assert.equal(res.body.error.code, "FORBIDDEN");
  assert.equal(eodControllerMock.getLiveEodRanking.mock.calls.length, 0);
});

test("GET /api/eod/live reaches the controller with a valid token and EOD_VIEW", async () => {
  authState.user = { id: "user-1", username: "alice", role: "viewer", orgId: ORG_UUID };
  authState.authz = makeAuthz(["EOD_VIEW"]);

  const res = await request(app).get("/api/eod/live").set("Authorization", "Bearer token");

  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(eodControllerMock.getLiveEodRanking.mock.calls.length, 1);
});
