const { describe, it, beforeEach, mock } = require("node:test");
const assert = require("node:assert");

// Setup minimal env
process.env.NODE_ENV = "test";

// The helper holds a reference to the models singleton and calls
// db.sequelize.query() at request time, so swapping db.sequelize for a mock
// before invoking is sufficient (same pattern as tenantMiddleware.test.js).
const db = require("../../models");
const { applyTenantContext, UUID_RE } = require("../../middleware/tenantContext");

const SET_TENANT_SQL = "SELECT set_config('app.tenant_id', $1, false)";
const SET_SUPER_ADMIN_SQL = "SELECT set_config('app.is_super_admin', $1, false)";

const ORG_A = "7f9c1c04-2b1e-4f7a-9c1a-1a2b3c4d5e6f";

describe("tenantContext.applyTenantContext (ADR-1 shared helper)", () => {
  let res, finishHandler;

  beforeEach(() => {
    db.sequelize = {
      query: mock.fn(async () => [{}]),
    };
    finishHandler = null;
    res = {
      on: mock.fn((event, handler) => {
        if (event === "finish") finishHandler = handler;
      }),
    };
  });

  function queryCalls() {
    return db.sequelize.query.mock.calls;
  }

  it("sets app.tenant_id and app.is_super_admin with parameterized bindings", async () => {
    await applyTenantContext(res, { tenantId: ORG_A, isSuperAdmin: true });

    const calls = queryCalls();
    assert.strictEqual(calls.length, 2, "tenant + super-admin settings written");

    // Parameterized SQL with bindings, no interpolation
    assert.strictEqual(calls[0].arguments[0], SET_TENANT_SQL);
    assert.deepStrictEqual(calls[0].arguments[1].bind, [ORG_A]);
    assert.strictEqual(calls[1].arguments[0], SET_SUPER_ADMIN_SQL);
    assert.deepStrictEqual(calls[1].arguments[1].bind, ["true"]);

    // SECURITY: the raw orgId must never appear inside the SQL strings
    for (const call of calls) {
      assert.ok(
        !call.arguments[0].includes(ORG_A),
        "SQL must not contain the raw orgId (SQL injection)"
      );
    }
  });

  it("defaults to NULL tenant and 'false' super admin when nothing is provided", async () => {
    await applyTenantContext(res);

    const calls = queryCalls();
    assert.strictEqual(calls.length, 2);
    assert.deepStrictEqual(calls[0].arguments[1].bind, [null], "tenant defaults to NULL");
    assert.deepStrictEqual(calls[1].arguments[1].bind, ["false"], "not a super admin by default");
  });

  it("resets both settings to NULL on response finish so pooled connections never leak", async () => {
    await applyTenantContext(res, { tenantId: ORG_A, isSuperAdmin: true });

    assert.ok(finishHandler, "finish handler should be registered");
    finishHandler();

    const calls = queryCalls();
    assert.strictEqual(calls.length, 4, "cleanup should issue both resets");
    assert.strictEqual(calls[2].arguments[0], SET_TENANT_SQL);
    assert.deepStrictEqual(calls[2].arguments[1].bind, [null], "tenant reset to NULL on finish");
    assert.strictEqual(calls[3].arguments[0], SET_SUPER_ADMIN_SQL);
    assert.deepStrictEqual(calls[3].arguments[1].bind, [null], "super admin reset on finish");
  });

  it("is idempotent — later call wins, duplicate finish cleanup is harmless", async () => {
    await applyTenantContext(res, { tenantId: ORG_A, isSuperAdmin: false });
    await applyTenantContext(res, { tenantId: null, isSuperAdmin: false });

    // Later call wins for the request: tenant re-written to NULL
    const calls = queryCalls();
    assert.strictEqual(calls.length, 4);
    assert.deepStrictEqual(calls[2].arguments[1].bind, [null]);

    // Both registered finish handlers reset to NULL (harmless duplication)
    finishHandler();
    finishHandler();
    const afterFinish = queryCalls();
    assert.strictEqual(afterFinish.length, 8);
    for (const call of afterFinish.slice(4)) {
      assert.deepStrictEqual(call.arguments[1].bind, [null], "every reset targets NULL");
    }
  });

  it("keeps the request non-fatal when set_config fails and still registers cleanup", async () => {
    db.sequelize.query = mock.fn(async () => {
      throw new Error("relation does not exist");
    });

    await applyTenantContext(res, { tenantId: ORG_A, isSuperAdmin: true });

    assert.ok(finishHandler, "cleanup handler should still be registered");
  });

  it("exports the UUID regex used by tenantMiddleware", () => {
    assert.ok(UUID_RE.test(ORG_A), "valid UUID accepted");
    assert.ok(!UUID_RE.test("'; DROP TABLE users; --"), "SQL probe rejected");
    assert.ok(!UUID_RE.test("not-a-uuid"), "plain string rejected");
  });
});
