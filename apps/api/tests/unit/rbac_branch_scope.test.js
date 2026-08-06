const { beforeEach, mock, test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_min_16_chars";

const baseDir = path.resolve(__dirname, "../../");

// ---- Module mocks (same require.cache pattern as media_upload_org.test.js) ----
// authzService is mocked so permission/branch decisions are controllable;
// models is mocked so the store→branch lookup never touches Postgres.
const authzState = {
  canAccess: () => false,
  allowedBranches: [],
};
const authzServiceMock = {
  hasPermission: mock.fn(() => true),
  canAccessBranch: mock.fn((_authz, branchId) => authzState.canAccess(branchId)),
  getAllowedBranches: mock.fn(() => authzState.allowedBranches),
};

const dbMock = {
  Sequelize: { QueryTypes: {} },
  sequelize: { query: mock.fn(async () => []) },
};

const mockModules = {
  [path.join(baseDir, "services/authzService.js")]: authzServiceMock,
  [path.join(baseDir, "models/index.js")]: dbMock,
};

Object.entries(mockModules).forEach(([absPath, exports]) => {
  require.cache[absPath] = { id: absPath, filename: absPath, loaded: true, exports };
});

const { requirePermission } = require("../../middleware/rbac");

function makeRes() {
  const res = { json: mock.fn(), status: mock.fn(() => res) };
  return res;
}

function branchScopedAuthz(isAllBranches) {
  return {
    userId: "user-1",
    roleNames: ["viewer"],
    effectivePerms: ["STORES_VIEW"],
    scopeBranches: ["branch-1"],
    isAllBranches,
  };
}

beforeEach(() => {
  authzState.canAccess = () => false;
  authzState.allowedBranches = [];
  authzServiceMock.hasPermission.mock.resetCalls();
  authzServiceMock.canAccessBranch.mock.resetCalls();
  authzServiceMock.getAllowedBranches.mock.resetCalls();
  dbMock.sequelize.query.mock.resetCalls();
});

test("branch-scope permission with no resolvable branch fails closed with 403 BRANCH_SCOPE_REQUIRED", async () => {
  const mw = requirePermission("STORES_VIEW", { scope: "branch", branchFrom: "params" });
  const req = { authz: branchScopedAuthz(false), params: {} };
  const res = makeRes();
  let calledNext = false;

  await mw(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, false);
  assert.equal(res.status.mock.calls[0].arguments[0], 403);
  assert.equal(res.json.mock.calls[0].arguments[0].error.code, "BRANCH_SCOPE_REQUIRED");
});

test("isAllBranches users pass without any branchId", async () => {
  const mw = requirePermission("STORES_VIEW", { scope: "branch", branchFrom: "params" });
  const req = { authz: branchScopedAuthz(true), params: {} };
  const res = makeRes();
  let calledNext = false;

  await mw(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, true);
  assert.equal(res.status.mock.calls.length, 0);
});

test("env_admin (super_admin authz, isAllBranches) passes without any branchId", async () => {
  const mw = requirePermission("STORES_VIEW", { scope: "branch", branchFrom: "params" });
  const req = {
    authz: { userId: "env_admin", roleNames: ["super_admin"], isAllBranches: true },
    params: {},
  };
  const res = makeRes();
  let calledNext = false;

  await mw(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, true);
  assert.equal(res.status.mock.calls.length, 0);
});

test("explicit allowed branchId passes (existing positive path preserved)", async () => {
  authzState.canAccess = (branchId) => branchId === "branch-1";
  const mw = requirePermission("STORES_VIEW", { scope: "branch", branchFrom: "params" });
  const req = { authz: branchScopedAuthz(false), params: { branchId: "branch-1" } };
  const res = makeRes();
  let calledNext = false;

  await mw(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, true);
  assert.equal(res.status.mock.calls.length, 0);
  assert.equal(authzServiceMock.canAccessBranch.mock.calls.length, 1);
});

test("explicit denied branchId still returns 403 FORBIDDEN (existing denial preserved)", async () => {
  const mw = requirePermission("STORES_VIEW", { scope: "branch", branchFrom: "params" });
  const req = { authz: branchScopedAuthz(false), params: { branchId: "branch-9" } };
  const res = makeRes();
  let calledNext = false;

  await mw(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, false);
  assert.equal(res.status.mock.calls[0].arguments[0], 403);
  assert.equal(res.json.mock.calls[0].arguments[0].error.code, "FORBIDDEN");
});

test("branchFrom query/body also fail closed when no branch is present", async () => {
  const mwQuery = requirePermission("STORES_VIEW", { scope: "branch", branchFrom: "query" });
  const resQuery = makeRes();
  await mwQuery({ authz: branchScopedAuthz(false), query: {}, params: {} }, resQuery, () => {});
  assert.equal(resQuery.status.mock.calls[0].arguments[0], 403);
  assert.equal(resQuery.json.mock.calls[0].arguments[0].error.code, "BRANCH_SCOPE_REQUIRED");

  const mwBody = requirePermission("STORES_VIEW", { scope: "branch", branchFrom: "body" });
  const resBody = makeRes();
  await mwBody({ authz: branchScopedAuthz(false), body: {}, params: {} }, resBody, () => {});
  assert.equal(resBody.status.mock.calls[0].arguments[0], 403);
  assert.equal(resBody.json.mock.calls[0].arguments[0].error.code, "BRANCH_SCOPE_REQUIRED");
});

test("store lookup that cannot resolve a branch fails closed", async () => {
  // dbMock.sequelize.query returns [] → no store row → branchId stays null.
  const mw = requirePermission("STORES_VIEW", {
    scope: "branch",
    branchFrom: "auto",
    storeLookup: true,
  });
  const req = {
    authz: branchScopedAuthz(false),
    params: { storeCode: "S001" },
    query: {},
    body: {},
  };
  const res = makeRes();
  let calledNext = false;

  await mw(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, false);
  assert.equal(res.status.mock.calls[0].arguments[0], 403);
  assert.equal(res.json.mock.calls[0].arguments[0].error.code, "BRANCH_SCOPE_REQUIRED");
  assert.equal(dbMock.sequelize.query.mock.calls.length, 1);
});
