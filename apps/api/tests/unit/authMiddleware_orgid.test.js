const { describe, it } = require("node:test");
const assert = require("node:assert");
const jwt = require("jsonwebtoken");
const path = require("path");

// Setup minimal env
process.env.NODE_ENV = "test";

const SECRET = "test_secret_min_16_chars";
const baseDir = path.resolve(__dirname, "../../");

// -- MOCKING INFRASTRUCTURE --
// Intercept the modules that would hit the DB or the environment schema.
// NOTE: authMiddleware destructures `const { loadUserAuthz } = require(...)`
// at load time, so the mock must be a delegating function (reassigning the
// property afterwards would not be visible to the destructured reference).
const mockEnv = { JWT_SECRET: SECRET };
let loadUserAuthzImpl = async () => null;
const mockAuthzService = {
  loadUserAuthz: (...args) => loadUserAuthzImpl(...args),
};
// authMiddleware destructures `const { setOrgId } = require("../services/dataClient")`
// at load time (Slice 4), so mock the module to keep this test DB-free.
const mockDataClient = {
  setOrgId: async () => {},
};

const mockModules = {
  [path.join(baseDir, "config/env.js")]: mockEnv,
  [path.join(baseDir, "services/authzService.js")]: mockAuthzService,
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
  // authMiddleware now registers tenant-context cleanup via res.on("finish")
  // after verification (Slice 4b); no-op is fine here.
  res.on = () => {};
  return res;
}

describe("authMiddleware — orgId plumbing from JWT claim", () => {
  it("attaches the JWT orgId claim to req.user", async () => {
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
    assert.strictEqual(req.user.orgId, ORG_ID, "req.user.orgId must come from the JWT");
  });

  it("keeps req.user.orgId null when the JWT has no orgId claim (env_admin)", async () => {
    const token = jwt.sign({ id: "env_admin", username: "admin", role: "super_admin" }, SECRET, {
      expiresIn: "1h",
    });
    let authzLoaded = false;
    loadUserAuthzImpl = async () => {
      authzLoaded = true;
      return null;
    };

    let nextCalled = false;
    const req = { headers: { authorization: `Bearer ${token}` }, id: "r-2" };
    const res = makeRes();

    await authMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.user.orgId, null, "env_admin keeps no org");
    assert.strictEqual(req.user.role, "super_admin");
    assert.strictEqual(authzLoaded, false, "env_admin short-circuits authz loading");
  });
});
