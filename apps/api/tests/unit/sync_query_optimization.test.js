const { describe, it, before, mock } = require("node:test");
const assert = require("node:assert");

// Setup Env
process.env.NODE_ENV = "test";
process.env.DATA_SYNC_TEST_MODE = "false"; // Force DB path

// Mock DB
const db = require("../../models");

// Mock Sequelize query
db.sequelize.query = mock.fn(async () => [[], { rowCount: 0 }]);
db.Sequelize = { Op: {} };

const syncController = require("../../controllers/syncController");

describe("Sync Query Optimization", () => {
  let capturedSql = [];

  before(() => {
    // Intercept queries
    db.sequelize.query.mock.mockImplementation(async (sql) => {
      capturedSql.push(sql);
      // Mock metadata query response
      if (sql.includes("SELECT MAX(updated_at)")) {
        return [[{ updated_at: new Date().toISOString() }]];
      }
      // Mock count query
      if (sql.includes("COUNT(*)")) {
        return [[{ total: 100 }]];
      }
      // Mock data query
      return [[], { rowCount: 0 }];
    });
  });

  it("should use optimized range query for status='synced'", async () => {
    capturedSql = [];
    const req = {
      query: { status: "synced", page: "1", pageSize: "50" },
      authz: { isAllBranches: true },
    };
    const res = {
      json: () => {},
      status: () => res,
    };

    await syncController.getSyncStores(req, res, (err) => {
      throw err;
    });

    const dataQuery = capturedSql.find(
      (sql) => sql.includes("FROM store_sync_snapshot") && sql.includes("LIMIT")
    );
    assert.ok(dataQuery, "Data query not found");
    assert.match(dataQuery, /last_sync_epoch >=/, "Should use range query for synced");
    assert.doesNotMatch(
      dataQuery,
      /CASE.*WHEN.*synced/,
      "Should NOT use CASE status expression for synced"
    );
  });

  it("should use optimized range query for status='stale'", async () => {
    capturedSql = [];
    const req = {
      query: { status: "stale", page: "1", pageSize: "50" },
      authz: { isAllBranches: true },
    };
    const res = {
      json: () => {},
      status: () => res,
    };

    await syncController.getSyncStores(req, res, (err) => {
      throw err;
    });

    const dataQuery = capturedSql.find(
      (sql) => sql.includes("FROM store_sync_snapshot") && sql.includes("LIMIT")
    );
    assert.ok(dataQuery, "Data query not found");
    assert.match(
      dataQuery,
      /last_sync_epoch >=.*AND.*last_sync_epoch </,
      "Should use range query for stale"
    );
  });

  it("should use optimized range query for status='problem'", async () => {
    capturedSql = [];
    const req = {
      query: { status: "problem", page: "1", pageSize: "50" },
      authz: { isAllBranches: true },
    };
    const res = {
      json: () => {},
      status: () => res,
    };

    await syncController.getSyncStores(req, res, (err) => {
      throw err;
    });

    const dataQuery = capturedSql.find(
      (sql) => sql.includes("FROM store_sync_snapshot") && sql.includes("LIMIT")
    );
    assert.ok(dataQuery, "Data query not found");
    assert.match(
      dataQuery,
      /last_sync_epoch <.*OR.*last_sync_epoch IS NULL/,
      "Should use range query for problem"
    );
  });

  it("should use optimized sort order by default", async () => {
    capturedSql = [];
    const req = {
      query: { page: "1", pageSize: "50" }, // Default sort
      authz: { isAllBranches: true },
    };
    const res = {
      json: () => {},
      status: () => res,
    };

    await syncController.getSyncStores(req, res, (err) => {
      throw err;
    });

    const dataQuery = capturedSql.find(
      (sql) => sql.includes("FROM store_sync_snapshot") && sql.includes("LIMIT")
    );
    assert.ok(dataQuery, "Data query not found");
    assert.ok(
      dataQuery.includes("ORDER BY last_sync_epoch ASC NULLS FIRST"),
      "Should use optimized ORDER BY"
    );
    assert.doesNotMatch(
      dataQuery,
      /CASE.*WHEN.*problem.*THEN 0/,
      "Should NOT use complex CASE sort"
    );
  });
});
