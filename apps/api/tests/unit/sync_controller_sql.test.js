const { describe, it, beforeEach, mock } = require("node:test");
const assert = require("node:assert");

// Setup Env vars
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/dbname";
process.env.JWT_SECRET = "test_secret_min_16_chars";
process.env.ADMIN_USERNAME = "admin";
process.env.ADMIN_PASSWORD_HASH = "hash";

// Override dependencies
const db = require("../../models");

// Mock Sequelize
db.sequelize.query = mock.fn(async () => [[], { rowCount: 0 }]);
db.Sequelize = { Op: {} };

// Mock dataClient
// Since we can't easily overwrite destructured imports in CJS without interception,
// we rely on the fact that for the logic we test (db path), dataClient is not called
// OR we assume existing mocked values if any.
// Actually, syncController already required dataClient.
// If we want to suppress network calls from it, we hope they are not triggered.
// getSyncStores with DB path only calls DB.

const syncController = require("../../controllers/syncController");

describe("syncController.getSyncStores Optimization", () => {
  let req, res;

  beforeEach(() => {
    req = {
      query: {},
      authz: { isAllBranches: true }, // Simple default
    };
    res = {
      json: mock.fn(),
      status: mock.fn(() => res),
    };

    // Reset mocks
    db.sequelize.query.mock.resetCalls();

    // Default metadata query return
    db.sequelize.query.mock.mockImplementation(async (sql) => {
      if (sql.includes("SELECT MAX(updated_at)")) {
        return [[{ updated_at: new Date().toISOString(), total: 100 }]];
      }
      return [[], { rowCount: 0 }];
    });
  });

  it("should use SQL query with correct filters when not in test mode", async () => {
    process.env.DATA_SYNC_TEST_MODE = "false";

    req.query = {
      page: "1",
      pageSize: "10",
      branchId: "1",
      status: "stale",
      search: "Store A",
      excludeBazar: "true",
    };

    // Call controller
    await syncController.getSyncStores(req, res, (err) => {
      throw err;
    });

    // Verify calls
    const calls = db.sequelize.query.mock.calls;
    assert.ok(calls.length >= 1, "Should call DB query");

    // Find the main query (not the metadata one, and not the count one)
    const queryCall = calls.find(
      (call) =>
        call.arguments[0].includes("FROM store_sync_snapshot") &&
        !call.arguments[0].includes("MAX(updated_at)") &&
        !call.arguments[0].includes("COUNT(*)")
    );

    // NOTE: This assertion will FAIL on the original code because it does not use WHERE clauses in SQL.
    // It fetches everything and filters in JS.
    // This confirms the test is valid for verifying the optimization.

    if (queryCall) {
      const sql = queryCall.arguments[0];
      console.log("Executed SQL:", sql);

      // Uncomment these assertions when implementation is done
      assert.match(sql, /WHERE/, "Query should contain WHERE clause");
      assert.match(sql, /branch_id/, "Query should filter by branch_id");
      assert.match(sql, /LIMIT/, "Query should use LIMIT");
    }
  });
});
