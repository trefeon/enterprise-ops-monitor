const { describe, it, beforeEach, mock } = require("node:test");
const assert = require("node:assert");

// Setup minimal env
process.env.NODE_ENV = "test";

// The middleware holds a reference to the models singleton and calls
// db.sequelize.query() at request time, so swapping db.sequelize for a mock
// before invoking the middleware is sufficient (same pattern as
// rbac_escalation.test.js).
const db = require("../../models");
const tenantMiddleware = require("../../middleware/tenantMiddleware");

const SET_TENANT_SQL = "SELECT set_config('app.tenant_id', $1, false)";
const SET_SUPER_ADMIN_SQL = "SELECT set_config('app.is_super_admin', $1, false)";

const ORG_A = "7f9c1c04-2b1e-4f7a-9c1a-1a2b3c4d5e6f";
const ORG_B = "a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

describe("tenantMiddleware (ADR-1: parameterized set_config + reset discipline)", () => {
  let req, res, next, finishHandler;

  beforeEach(() => {
    db.sequelize = {
      query: mock.fn(async () => [{}]),
    };
    finishHandler = null;
    res = {
      status: mock.fn(function () {
        return res;
      }),
      json: mock.fn(),
      on: mock.fn((event, handler) => {
        if (event === "finish") finishHandler = handler;
      }),
    };
    req = { params: {}, user: null };
    next = mock.fn();
  });

  function queryCalls() {
    return db.sequelize.query.mock.calls;
  }

  it("uses a parameterized set_config with bindings and never interpolates raw orgId", async () => {
    req.params = { orgId: ORG_A };
    req.user = { id: "u-1", orgId: ORG_A };

    await tenantMiddleware(req, res, next);

    assert.strictEqual(req.tenantId, ORG_A, "req.tenantId should be set");
    assert.strictEqual(next.mock.callCount(), 1, "next() should be called");

    const calls = queryCalls();
    assert.strictEqual(calls.length, 2, "tenant + is_super_admin settings written");

    // Tenant setting: parameterized SQL with bindings, no interpolation
    assert.strictEqual(calls[0].arguments[0], SET_TENANT_SQL);
    assert.deepStrictEqual(calls[0].arguments[1].bind, [ORG_A]);

    // Super-admin setting: 'false' for a regular user
    assert.strictEqual(calls[1].arguments[0], SET_SUPER_ADMIN_SQL);
    assert.deepStrictEqual(calls[1].arguments[1].bind, ["false"]);

    // SECURITY: the raw orgId must never appear inside the SQL strings
    for (const call of calls) {
      assert.ok(
        !call.arguments[0].includes(ORG_A),
        "SQL must not contain the raw orgId (SQL injection)"
      );
    }

    // Finish cleanup handler registered
    assert.strictEqual(res.on.mock.callCount(), 1);
    assert.strictEqual(res.on.mock.calls[0].arguments[0], "finish");
  });

  it("rejects a non-UUID orgId with 400 before any SQL runs", async () => {
    req.params = { orgId: "'; DROP TABLE users; --" };
    req.user = { id: "u-1", orgId: ORG_A };

    await tenantMiddleware(req, res, next);

    assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    assert.strictEqual(res.json.mock.calls[0].arguments[0].error.code, "INVALID_ORG_ID");
    assert.strictEqual(queryCalls().length, 0, "no SQL should run for a non-UUID orgId");
    assert.strictEqual(next.mock.callCount(), 0, "next() should not be called");
  });

  it("rejects a UUID orgId that does not match the JWT orgId with 403 TENANT_MISMATCH", async () => {
    req.params = { orgId: ORG_B };
    req.user = { id: "u-1", orgId: ORG_A };

    await tenantMiddleware(req, res, next);

    assert.strictEqual(res.status.mock.calls[0].arguments[0], 403);
    assert.strictEqual(res.json.mock.calls[0].arguments[0].error.code, "TENANT_MISMATCH");
    assert.strictEqual(queryCalls().length, 0, "no SQL should run on mismatch");
    assert.strictEqual(next.mock.callCount(), 0, "next() should not be called");
  });

  it("sets app.is_super_admin to 'true' for env_admin and NULL tenant (no org)", async () => {
    req.user = { id: "env_admin", orgId: null };

    await tenantMiddleware(req, res, next);

    const calls = queryCalls();
    assert.strictEqual(calls.length, 2);
    assert.deepStrictEqual(calls[0].arguments[1].bind, [null], "env_admin has no tenant");
    assert.deepStrictEqual(calls[1].arguments[1].bind, ["true"], "env_admin is super admin");
    assert.strictEqual(next.mock.callCount(), 1);
  });

  it("resets app.tenant_id to NULL at request start when no tenant applies", async () => {
    req.params = {};
    req.user = null;

    await tenantMiddleware(req, res, next);

    const calls = queryCalls();
    assert.strictEqual(calls.length, 2);
    assert.deepStrictEqual(calls[0].arguments[1].bind, [null], "tenant reset to NULL");
    assert.deepStrictEqual(calls[1].arguments[1].bind, ["false"], "not a super admin");
    assert.strictEqual(next.mock.callCount(), 1);
  });

  it("resets both settings on response finish so pooled connections never leak tenant context", async () => {
    req.params = { orgId: ORG_A };
    req.user = { id: "u-1", orgId: ORG_A };

    await tenantMiddleware(req, res, next);

    assert.strictEqual(queryCalls().length, 2);
    assert.ok(finishHandler, "finish handler should be registered");

    // Simulate the response completing
    finishHandler();

    const calls = queryCalls();
    assert.strictEqual(calls.length, 4, "cleanup should issue both resets");
    assert.strictEqual(calls[2].arguments[0], SET_TENANT_SQL);
    assert.deepStrictEqual(calls[2].arguments[1].bind, [null], "tenant reset to NULL on finish");
    assert.strictEqual(calls[3].arguments[0], SET_SUPER_ADMIN_SQL);
    assert.deepStrictEqual(calls[3].arguments[1].bind, [null], "super admin reset on finish");
  });

  it("keeps the request non-fatal when set_config fails (RLS not ready)", async () => {
    db.sequelize.query = mock.fn(async () => {
      throw new Error("relation does not exist");
    });
    req.params = { orgId: ORG_A };
    req.user = { id: "u-1", orgId: ORG_A };

    await tenantMiddleware(req, res, next);

    assert.strictEqual(next.mock.callCount(), 1, "next() should still be called");
    assert.ok(finishHandler, "cleanup handler should still be registered");
  });
});
