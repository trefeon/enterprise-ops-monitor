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

  it("should map optimized snapshot rows without undefined branch lookup crash", async () => {
    capturedSql = [];
    db.sequelize.query.mock.mockImplementation(async (sql) => {
      capturedSql.push(sql);
      if (sql.includes("SELECT MAX(updated_at)")) {
        return [[{ updated_at: new Date().toISOString() }]];
      }
      if (sql.includes("COUNT(*)")) {
        return [[{ total: 1 }]];
      }
      return [
        [
          {
            branch_id: "2",
            kodetoko: "302001",
            nama_toko: "Demo Store",
            last_sync_epoch: Math.floor(Date.now() / 1000) - 700,
            updated_at: new Date().toISOString(),
            status: "problem",
            age_sec: 700,
          },
        ],
        { rowCount: 1 },
      ];
    });

    const req = {
      query: { page: "1", pageSize: "50", sort: "ageDesc", excludeBazar: "1", status: "problem" },
      authz: { isAllBranches: true },
    };
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };

    let nextError = null;
    await syncController.getSyncStores(req, res, (err) => {
      nextError = err;
    });

    assert.equal(nextError, null);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data[0].branchName, "NORTH HUB");
  });

  it("should not return 500 when optimized snapshot table is unavailable", async () => {
    capturedSql = [];
    db.sequelize.query.mock.mockImplementation(async () => {
      const err = new Error('relation "store_sync_snapshot" does not exist');
      err.code = "42P01";
      throw err;
    });

    const req = {
      query: {
        page: "1",
        pageSize: "50",
        sort: "ageDesc",
        excludeBazar: "1",
        status: "problem",
      },
      authz: { isAllBranches: true },
    };
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };

    let nextError = null;
    await syncController.getSyncStores(req, res, (err) => {
      nextError = err;
    });

    assert.equal(nextError, null);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.error.code, "SYNC_SNAPSHOT_EMPTY");
  });
});
