const { describe, it, mock } = require("node:test");
const assert = require("node:assert");

// Setup Env
process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/dbname";
process.env.JWT_SECRET = "secret";

// Mock DB
const db = require("../../models");

// Mock dataClient
const dataClient = require("../../services/dataClient");

describe("dataSyncService optimization", () => {
  it("should query specific store codes instead of full table scan", async () => {
    // Reset mocks
    if (db.sequelize.query.mock) db.sequelize.query.mock.resetCalls();
    else db.sequelize.query = mock.fn();

    db.sequelize.transaction = mock.fn(async (callback) => callback("mockTransaction"));

    // Mock dataClient methods
    dataClient.fetchEodAllBranches = mock.fn(async () => ({
      rows: [{ storeCode: "101" }],
      businessDate: "2023-01-01",
    }));
    dataClient.fetchEmployeesAllBranches = mock.fn(async () => ({
      rows: [
        { name: "Emp1", storeCode: "101" }, // In EOD
        { name: "Emp2", storeCode: "102" }, // Not in EOD, but in DB
        { name: "Emp3", storeCode: "103" }, // Not in EOD, not in DB
      ],
    }));
    dataClient.invalidateEodCache = mock.fn();
    dataClient.invalidateEmployeeCache = mock.fn();

    // Mock DB query behavior
    db.sequelize.query.mock.mockImplementation(async (sql, _options) => {
      // Logic for catching the query
      if (sql.includes("SELECT store_code FROM data_stores")) {
        // Return simulated DB state: store 101 and 102 exist.
        // If query has WHERE IN clause, return only matching
        if (sql.includes("WHERE store_code IN")) {
          // Return only 102 because 101 is filtered out before calling DB?
          // No, 101 is filtered out because it's in eodRows.
          // So we expect query for 102 and 103.
          // DB has 102.
          return [{ store_code: "102" }];
        }
        // Fallback (old behavior): return all stores
        return [{ store_code: "101" }, { store_code: "102" }];
      }
      // For other queries (INSERTs), return empty success
      return [[], { rowCount: 1 }];
    });

    // Require service under test
    const { syncDataToDb } = require("../../services/dataSyncService");

    await syncDataToDb({ includeEmployees: true });

    const calls = db.sequelize.query.mock.calls;
    const selectCalls = calls.filter((c) =>
      c.arguments[0].includes("SELECT store_code FROM data_stores")
    );

    assert.strictEqual(selectCalls.length, 1, "Should call SELECT store_code exactly once");
    const query = selectCalls[0].arguments[0];

    // This assertion will FAIL before optimization.
    assert.match(query, /WHERE store_code IN/, "Query should use WHERE IN clause");
  });
});
