const { beforeEach, mock, test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_min_16_chars";

const baseDir = path.resolve(__dirname, "../../");

// ---- Module mocks (no Postgres) ----
// Same require.cache pattern as media_upload_org.test.js: models/index.js is
// replaced BEFORE usersController is required so its destructured imports
// (User, Role, UserRole, sequelize, ...) resolve to the mocks.
const dbMock = {
  Sequelize: require("sequelize"),
  sequelize: {
    transaction: mock.fn(async () => ({
      commit: mock.fn(async () => {}),
      rollback: mock.fn(async () => {}),
    })),
  },
  User: {
    findAndCountAll: mock.fn(async () => ({ rows: [], count: 0 })),
    findByPk: mock.fn(async () => null),
    findOne: mock.fn(async () => null),
    create: mock.fn(async (data) => ({ id: "new-user-1", ...data })),
  },
  Role: {
    findOne: mock.fn(async () => ({ id: 1, name: "viewer" })),
  },
  UserRole: { create: mock.fn(async () => ({})) },
  UserPermissionOverride: {},
  UserBranchScope: {},
};

require.cache[path.join(baseDir, "models/index.js")] = {
  id: path.join(baseDir, "models/index.js"),
  filename: path.join(baseDir, "models/index.js"),
  loaded: true,
  exports: dbMock,
};

const usersController = require("../../controllers/usersController");

const ORG_UUID = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG = "22222222-2222-4222-8222-222222222222";

function makeRes() {
  const res = { json: mock.fn(), status: mock.fn(() => res) };
  return res;
}

function orgActor(overrides = {}) {
  return { id: "user-1", username: "alice", role: "org_admin", orgId: ORG_UUID, ...overrides };
}

function foundUser() {
  return {
    id: "user-2",
    username: "bob",
    role: "viewer",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    roles: [],
    permissionOverrides: [],
    branchScopes: [],
  };
}

beforeEach(() => {
  dbMock.User.findAndCountAll.mock.resetCalls();
  dbMock.User.findByPk.mock.resetCalls();
  dbMock.User.findOne.mock.resetCalls();
  dbMock.User.create.mock.resetCalls();
  dbMock.Role.findOne.mock.resetCalls();
  dbMock.UserRole.create.mock.resetCalls();
  dbMock.sequelize.transaction.mock.resetCalls();

  // Re-establish default implementations: tests that override them with
  // mock.mockImplementation must not leak into the next test.
  dbMock.User.findAndCountAll.mock.mockImplementation(async () => ({ rows: [], count: 0 }));
  dbMock.User.findByPk.mock.mockImplementation(async () => null);
  dbMock.User.findOne.mock.mockImplementation(async () => null);
});

// ---- listUsers ----

test("listUsers scopes to req.tenantId when provided", async () => {
  const req = { tenantId: ORG_UUID, user: orgActor(), query: {} };
  const res = makeRes();

  await usersController.listUsers(req, res);

  const args = dbMock.User.findAndCountAll.mock.calls[0].arguments[0];
  assert.equal(args.where.org_id, ORG_UUID);
  assert.equal(res.status.mock.calls[0].arguments[0], 200);
});

test("listUsers falls back to the JWT orgId claim when no tenant is resolved", async () => {
  const req = { user: orgActor(), query: {} };
  const res = makeRes();

  await usersController.listUsers(req, res);

  const args = dbMock.User.findAndCountAll.mock.calls[0].arguments[0];
  assert.equal(args.where.org_id, ORG_UUID);
});

test("listUsers keeps the username search filter alongside the org filter", async () => {
  const req = { tenantId: ORG_UUID, user: orgActor(), query: { q: "ali" } };
  const res = makeRes();

  await usersController.listUsers(req, res);

  const args = dbMock.User.findAndCountAll.mock.calls[0].arguments[0];
  assert.equal(args.where.org_id, ORG_UUID);
  assert.ok(args.where.username, "username search filter must be preserved");
});

test("listUsers as env_admin has NO org filter (cross-tenant admin)", async () => {
  const req = {
    tenantId: OTHER_ORG,
    user: { id: "env_admin", username: "env_admin", role: "super_admin", orgId: null },
    query: {},
  };
  const res = makeRes();

  await usersController.listUsers(req, res);

  const args = dbMock.User.findAndCountAll.mock.calls[0].arguments[0];
  assert.equal("org_id" in args.where, false, "env_admin must not be org-filtered");
  assert.deepEqual(args.where, {});
});

test("listUsers as a super_admin DB user has NO org filter", async () => {
  const req = {
    tenantId: OTHER_ORG,
    user: orgActor(),
    authz: { roleNames: ["super_admin"] },
    query: {},
  };
  const res = makeRes();

  await usersController.listUsers(req, res);

  const args = dbMock.User.findAndCountAll.mock.calls[0].arguments[0];
  assert.equal("org_id" in args.where, false);
});

test("listUsers as an org_owner is STILL org-scoped (isAllBranches != cross-tenant)", async () => {
  const req = {
    tenantId: ORG_UUID,
    user: orgActor({ role: "org_owner" }),
    authz: { roleNames: ["org_owner"], isAllBranches: true },
    query: {},
  };
  const res = makeRes();

  await usersController.listUsers(req, res);

  const args = dbMock.User.findAndCountAll.mock.calls[0].arguments[0];
  assert.equal(args.where.org_id, ORG_UUID);
});

test("listUsers fails closed (403) when a non-admin actor has no org context", async () => {
  const req = { user: orgActor({ orgId: null }), query: {} };
  const res = makeRes();

  await usersController.listUsers(req, res);

  assert.equal(res.status.mock.calls[0].arguments[0], 403);
  assert.equal(res.json.mock.calls[0].arguments[0].error.code, "FORBIDDEN");
  assert.equal(dbMock.User.findAndCountAll.mock.calls.length, 0);
});

// ---- getUser ----

test("getUser scopes the lookup to the actor's org (where id + org_id)", async () => {
  dbMock.User.findOne.mock.mockImplementation(async () => foundUser());
  const req = { params: { id: "user-2" }, user: orgActor(), query: {} };
  const res = makeRes();

  await usersController.getUser(req, res);

  const args = dbMock.User.findOne.mock.calls[0].arguments[0];
  assert.equal(args.where.id, "user-2");
  assert.equal(args.where.org_id, ORG_UUID);
  assert.equal(res.status.mock.calls[0].arguments[0], 200);
  assert.equal(res.json.mock.calls[0].arguments[0].data.user.username, "bob");
});

test("getUser returns 404 when the target user is outside the actor's org", async () => {
  // findOne returns null: the user exists (in another org) but is not scoped.
  const req = { params: { id: "user-2" }, user: orgActor(), query: {} };
  const res = makeRes();

  await usersController.getUser(req, res);

  assert.equal(res.status.mock.calls[0].arguments[0], 404);
  assert.equal(res.json.mock.calls[0].arguments[0].error.code, "NOT_FOUND");
});

test("getUser as env_admin uses findByPk with no org filter", async () => {
  dbMock.User.findByPk.mock.mockImplementation(async () => foundUser());
  const req = {
    params: { id: "user-2" },
    user: { id: "env_admin", username: "env_admin", role: "super_admin", orgId: null },
    query: {},
  };
  const res = makeRes();

  await usersController.getUser(req, res);

  assert.equal(dbMock.User.findByPk.mock.calls.length, 1);
  assert.equal(dbMock.User.findByPk.mock.calls[0].arguments[0], "user-2");
  assert.equal(dbMock.User.findOne.mock.calls.length, 0);
  assert.equal(res.status.mock.calls[0].arguments[0], 200);
});

test("getUser fails closed (403) when a non-admin actor has no org context", async () => {
  const req = { params: { id: "user-2" }, user: orgActor({ orgId: null }), query: {} };
  const res = makeRes();

  await usersController.getUser(req, res);

  assert.equal(res.status.mock.calls[0].arguments[0], 403);
  assert.equal(dbMock.User.findOne.mock.calls.length, 0);
  assert.equal(dbMock.User.findByPk.mock.calls.length, 0);
});

// ---- createUser ----

const createBody = { username: "newbie", password: "Str0ng!Pass", role: "viewer" };

test("createUser assigns org_id from the actor's org", async () => {
  const req = { user: orgActor(), body: { ...createBody } };
  const res = makeRes();

  await usersController.createUser(req, res);

  const createArgs = dbMock.User.create.mock.calls[0].arguments[0];
  assert.equal(createArgs.org_id, ORG_UUID);
  assert.equal(res.status.mock.calls[0].arguments[0], 201);
  assert.equal(dbMock.UserRole.create.mock.calls.length, 1);
});

test("createUser prefers req.tenantId over the JWT orgId", async () => {
  const req = { tenantId: ORG_UUID, user: orgActor({ orgId: null }), body: { ...createBody } };
  const res = makeRes();

  await usersController.createUser(req, res);

  const createArgs = dbMock.User.create.mock.calls[0].arguments[0];
  assert.equal(createArgs.org_id, ORG_UUID);
});

test("createUser as env_admin leaves org_id NULL (unscoped by design)", async () => {
  const req = {
    user: { id: "env_admin", username: "env_admin", role: "super_admin", orgId: null },
    body: { ...createBody },
  };
  const res = makeRes();

  await usersController.createUser(req, res);

  const createArgs = dbMock.User.create.mock.calls[0].arguments[0];
  assert.equal(createArgs.org_id, null);
  assert.equal(res.status.mock.calls[0].arguments[0], 201);
});

test("createUser fails closed (400) when an org actor has no org context", async () => {
  const req = { user: orgActor({ orgId: null }), body: { ...createBody } };
  const res = makeRes();

  await usersController.createUser(req, res);

  assert.equal(res.status.mock.calls[0].arguments[0], 400);
  assert.equal(res.json.mock.calls[0].arguments[0].error.code, "VALIDATION_ERROR");
  assert.equal(dbMock.User.create.mock.calls.length, 0);
  assert.equal(dbMock.sequelize.transaction.mock.calls.length, 0);
});
