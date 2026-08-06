const { describe, it, beforeEach, mock } = require("node:test");
const assert = require("node:assert");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");

// Setup minimal env
process.env.NODE_ENV = "test";

const SECRET = "test_secret_min_16_chars";
const baseDir = path.resolve(__dirname, "../../");

// -- MOCKING INFRASTRUCTURE --
// Populate require.cache to intercept require() calls in the controller
// (same pattern as auth_migration.test.js). The real config/env.js throws
// without a DATABASE_URL, so it MUST be intercepted.

const mockEnv = {
  JWT_SECRET: SECRET,
  ADMIN_USERNAME: "env_admin",
  ADMIN_PASSWORD_HASH: bcrypt.hashSync("envpass", 10),
};

// NOTE: authController destructures `const { loadUserAuthz } = require(...)`
// at load time, so the mock must be a delegating function (reassigning the
// property afterwards would not be visible to the destructured reference).
let loadUserAuthzImpl = async () => null;
const mockAuthzService = {
  loadUserAuthz: (...args) => loadUserAuthzImpl(...args),
};

const mockModels = {
  User: {
    findOne: async () => null,
    create: async () => ({}),
  },
  Role: {
    findOne: async () => null,
  },
  UserRole: {
    create: async () => ({}),
  },
};

const mockModules = {
  [path.join(baseDir, "models/index.js")]: mockModels,
  [path.join(baseDir, "config/env.js")]: mockEnv,
  [path.join(baseDir, "services/authzService.js")]: mockAuthzService,
};

Object.keys(mockModules).forEach((absPath) => {
  require.cache[absPath] = {
    id: absPath,
    filename: absPath,
    loaded: true,
    exports: mockModules[absPath],
  };
});

// Load the controller AFTER intercepting its dependencies
const authController = require("../../controllers/authController");

const ORG_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_ORG_ID = "33333333-3333-4333-8333-333333333333";
const USER_ID = "11111111-1111-4111-8111-111111111111";

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
  // ADR-5: auth endpoints set the auth_token httpOnly cookie — no-op here.
  res.cookie = () => {};
  return res;
}

describe("authController login — JWT orgId claim", () => {
  beforeEach(() => {
    mockModels.User.findOne = async () => null;
    loadUserAuthzImpl = async () => null;
  });

  it("signs orgId from the user record into the token and returns it in the user object", async () => {
    const password = "s3cretpw";
    mockModels.User.findOne = async ({ where }) => {
      if (where.username === "org_admin") {
        return {
          id: USER_ID,
          username: "org_admin",
          password_hash: bcrypt.hashSync(password, 10),
          role: "admin",
          org_id: ORG_ID,
          update: async () => {},
        };
      }
      return null;
    };
    loadUserAuthzImpl = async () => ({
      roleNames: ["admin"],
      effectivePerms: [],
      scopeBranches: [],
      isAllBranches: false,
    });

    const res = makeRes();
    await authController.login({ body: { username: "org_admin", password } }, res);

    assert.strictEqual(res.statusCode, 200, "login should succeed");
    const payload = jwt.decode(res.body.data.token);
    assert.ok(payload, "token should decode");
    assert.strictEqual(payload.orgId, ORG_ID, "JWT must carry the orgId claim");
    assert.strictEqual(payload.id, USER_ID);
    assert.strictEqual(res.body.data.user.orgId, ORG_ID, "login response user must carry orgId");
    // Proves the authz lookup mock was actually exercised (delegating mock works)
    assert.deepStrictEqual(res.body.data.user.roleNames, ["admin"]);
  });

  it("keeps orgId null for env_admin (no org) in token and response", async () => {
    const res = makeRes();
    await authController.login(
      { body: { username: "env_admin", password: "envpass" }, headers: {} },
      res
    );

    assert.strictEqual(res.statusCode, 200, "env_admin login should succeed");
    const payload = jwt.decode(res.body.data.token);
    assert.strictEqual(payload.orgId, null, "env_admin has no org");
    assert.strictEqual(res.body.data.user.orgId, null);
  });
});

describe("authController.invite — org resolution", () => {
  beforeEach(() => {
    mockModels.User.findOne = mock.fn(async () => null);
    mockModels.User.create = mock.fn(async (args) => ({
      id: "u-123",
      email: args.email,
    }));
    mockModels.Role.findOne = mock.fn(async ({ where }) =>
      where.name === "viewer" ? { id: 900, name: "viewer" } : null
    );
    mockModels.UserRole.create = mock.fn(async () => ({}));
  });

  function inviteReq(overrides = {}) {
    return {
      body: { email: "new@acme.com", roleName: "viewer", ...(overrides.body || {}) },
      protocol: "http",
      get: () => "localhost:3000",
      ...(overrides.extra || {}),
    };
  }

  it("creates user + user_role under req.user.orgId and keeps the inviteToken+inviteUrl shape", async () => {
    const res = makeRes();
    await authController.invite(inviteReq({ extra: { user: { id: "u-1", orgId: ORG_ID } } }), res);

    assert.strictEqual(res.statusCode, 200, "invite should succeed once orgId is populated");
    assert.ok(res.body.data.inviteToken, "inviteToken must be returned");
    assert.ok(
      res.body.data.inviteUrl.includes(res.body.data.inviteToken),
      "inviteUrl must embed the inviteToken"
    );

    const userArgs = mockModels.User.create.mock.calls[0].arguments[0];
    const roleArgs = mockModels.UserRole.create.mock.calls[0].arguments[0];
    assert.strictEqual(userArgs.org_id, ORG_ID, "invited user must be created under the org");
    assert.strictEqual(roleArgs.org_id, ORG_ID, "user_role row must carry the org_id");
  });

  it("falls back to req.tenantId when the JWT has no orgId", async () => {
    const res = makeRes();
    await authController.invite(inviteReq({ extra: { user: {}, tenantId: OTHER_ORG_ID } }), res);

    assert.strictEqual(res.statusCode, 200);
    const userArgs = mockModels.User.create.mock.calls[0].arguments[0];
    assert.strictEqual(userArgs.org_id, OTHER_ORG_ID, "must fall back to req.tenantId");
  });

  it("returns 400 and creates nothing when no org is resolvable", async () => {
    const res = makeRes();
    await authController.invite(inviteReq({ extra: { user: {} } }), res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.error.code, "BAD_REQUEST");
    assert.strictEqual(mockModels.User.create.mock.callCount(), 0);
  });
});
