const { describe, it, beforeEach, mock } = require("node:test");
const assert = require("node:assert");
const jwt = require("jsonwebtoken");
const path = require("path");

// Setup minimal env
process.env.NODE_ENV = "test";

const SECRET = "test_secret_min_16_chars";
const baseDir = path.resolve(__dirname, "../../");

const SET_TENANT_SQL = "SELECT set_config('app.tenant_id', $1, false)";
const SET_SUPER_ADMIN_SQL = "SELECT set_config('app.is_super_admin', $1, false)";

// -- MOCKING INFRASTRUCTURE --
// Intercept the modules that would hit the DB or the environment schema —
// same require.cache pattern as authMiddleware_orgid.test.js, plus models so
// the tenantContext helper's set_config calls can be asserted without a DB.
// NOTE: authMiddleware destructures `const { loadUserAuthz } = require(...)`
// (and `const { setOrgId } = require("../services/dataClient")`) at load time,
// so those mocks must be delegating functions.
const mockEnv = { JWT_SECRET: SECRET };
let loadUserAuthzImpl = async () => null;
const mockAuthzService = {
  loadUserAuthz: (...args) => loadUserAuthzImpl(...args),
};
const mockModels = {
  sequelize: {
    query: mock.fn(async () => [{}]),
  },
};
// setOrgId is destructured in authMiddleware, so the mock is the exported
// function itself (reset in beforeEach). It must resolve — the middleware
// awaits it inside a try/catch.
const mockDataClient = {
  setOrgId: mock.fn(async () => {}),
};

const mockModules = {
  [path.join(baseDir, "config/env.js")]: mockEnv,
  [path.join(baseDir, "services/authzService.js")]: mockAuthzService,
  [path.join(baseDir, "models/index.js")]: mockModels,
  [path.join(baseDir, "services/dataClient.js")]: mockDataClient,
};

Object.keys(mockModules).forEach((absPath) => {
  require.cache[absPath] = {
    id: absPath,
    filename: absPath,
    loaded: true,
    exports: mockModules[absPath],
  };
});

const authMiddleware = require("../../middleware/authMiddleware");

const ORG_ID = "22222222-2222-4222-8222-222222222222";

function makeRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  res.on = () => {};
  return res;
}

describe("authMiddleware — tenant context after JWT verification (Slice 4b)", () => {
  beforeEach(() => {
    mockModels.sequelize.query.mock.resetCalls();
    mockDataClient.setOrgId.mock.resetCalls();
  });

  function queryCalls() {
    return mockModels.sequelize.query.mock.calls;
  }

  function setOrgIdCalls() {
    return mockDataClient.setOrgId.mock.calls;
  }

  it("writes the JWT orgId as app.tenant_id after verifying a DB-user token", async () => {
    const token = jwt.sign({ id: "u-1", username: "bob", role: "viewer", orgId: ORG_ID }, SECRET, {
      expiresIn: "1h",
    });
    loadUserAuthzImpl = async () => ({
      roleNames: ["viewer"],
      effectivePerms: [],
      scopeBranches: [],
      isAllBranches: false,
    });

    let nextCalled = false;
    const req = { headers: { authorization: `Bearer ${token}` }, id: "r-1" };
    const res = makeRes();

    await authMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true, "next() should be called");
    assert.strictEqual(res.statusCode, null, "no error response expected");

    const calls = queryCalls();
    assert.strictEqual(calls.length, 2, "tenant + super-admin settings written");
    assert.strictEqual(calls[0].arguments[0], SET_TENANT_SQL);
    assert.deepStrictEqual(calls[0].arguments[1].bind, [ORG_ID], "RLS context uses the JWT orgId");
    assert.strictEqual(calls[1].arguments[0], SET_SUPER_ADMIN_SQL);
    assert.deepStrictEqual(calls[1].arguments[1].bind, ["false"], "DB users are not super admins");

    // Slice 4: the JWT orgId must also activate dataClient's org-scoped cache
    // keys (setOrgId called exactly once, with the JWT orgId).
    const orgCalls = setOrgIdCalls();
    assert.strictEqual(orgCalls.length, 1, "setOrgId must be called for a DB user with an org");
    assert.strictEqual(orgCalls[0].arguments[0], ORG_ID, "setOrgId receives the JWT orgId");
  });

  it("does not fail when setOrgId throws (non-fatal guard)", async () => {
    const token = jwt.sign(
      { id: "u-2", username: "carol", role: "viewer", orgId: ORG_ID },
      SECRET,
      {
        expiresIn: "1h",
      }
    );
    loadUserAuthzImpl = async () => ({
      roleNames: ["viewer"],
      effectivePerms: [],
      scopeBranches: [],
      isAllBranches: false,
    });
    mockDataClient.setOrgId.mock.mockImplementation(async () => {
      throw new Error("boom");
    });

    let nextCalled = false;
    const req = { headers: { authorization: `Bearer ${token}` }, id: "r-4" };
    const res = makeRes();

    await authMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true, "next() must still be called on setOrgId failure");
    assert.strictEqual(res.statusCode, null, "no error response expected");
  });

  it("sets is_super_admin to 'true' for env_admin (no tenant)", async () => {
    const token = jwt.sign(
      { id: "env_admin", username: "admin", role: "super_admin", orgId: null },
      SECRET,
      { expiresIn: "1h" }
    );

    let nextCalled = false;
    const req = { headers: { authorization: `Bearer ${token}` }, id: "r-2" };
    const res = makeRes();

    await authMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.user.orgId, null, "env_admin keeps no org");

    const calls = queryCalls();
    assert.strictEqual(calls.length, 2);
    assert.deepStrictEqual(calls[0].arguments[1].bind, [null], "env_admin has no tenant");
    assert.deepStrictEqual(calls[1].arguments[1].bind, ["true"], "env_admin bypasses RLS");

    // Slice 4: env_admin has no org — setOrgId must NOT be called so legacy
    // `data:legacy:*` cache keys stay correct for cross-tenant views.
    assert.strictEqual(setOrgIdCalls().length, 0, "setOrgId skipped for env_admin (no org)");
  });

  it("writes no tenant context before the token is verified (401 path)", async () => {
    const req = { headers: { authorization: "Bearer not-a-real-token" }, id: "r-3" };
    const res = makeRes();

    await authMiddleware(req, res, () => {});

    assert.strictEqual(res.statusCode, 401, "invalid token rejected");
    assert.strictEqual(queryCalls().length, 0, "no set_config before JWT verification");
    assert.strictEqual(setOrgIdCalls().length, 0, "setOrgId not called before JWT verification");
  });
});
