const { describe, it, before, mock } = require("node:test");

// Setup Env
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/dbname";
process.env.JWT_SECRET = "test_secret_min_16_chars";
process.env.ADMIN_USERNAME = "admin";
process.env.ADMIN_PASSWORD_HASH = "hash";

// Override db before requiring controller
const db = require("../models");

// Mock Sequelize query
db.sequelize.query = mock.fn(async () => [[], { rowCount: 0 }]);
db.Sequelize = { Op: {} }; // Mock Op if needed, though usually it's static

// Mock dataClient (if needed, but we rely on DB path)
// We can't easily mock destructured imports without mocking the module loading itself.
// But since we want to force DB path, we don't expect dataClient functions to be called.

const syncController = require("../controllers/syncController");

describe("Benchmark: getSyncStores", () => {
  const NUM_ROWS = 10000;
  const rows = [];

  before(() => {
    // Generate 10k rows
    const now = Date.now();
    for (let i = 0; i < NUM_ROWS; i++) {
      rows.push({
        branch_id: String((i % 10) + 1),
        kodetoko: String(10000 + i),
        nama_toko: `Store ${i}`,
        last_sync_epoch: Math.floor((now - Math.random() * 86400 * 1000) / 1000), // Random time within 24h
        updated_at: new Date(),
        status: "problem", // old value, will be recomputed
      });
    }
  });

  it("Measure performance", async () => {
    // Force the path that calls `loadCachedSyncSnapshotFromDb`.
    process.env.DATA_SYNC_TEST_MODE = "false";

    db.sequelize.query.mock.mockImplementation(async (sql) => {
      // Mock metadata query
      if (sql.includes("SELECT MAX(updated_at)")) {
        return [[{ updated_at: new Date().toISOString(), total: NUM_ROWS }]];
      }
      // Mock data query
      if (sql.includes("FROM store_sync_snapshot")) {
        console.log("SQL:", sql);
        // If query has WHERE/LIMIT/OFFSET, it's the NEW path.
        if (sql.includes("LIMIT") || sql.includes("OFFSET")) {
          console.log("Detected NEW optimized path (SQL Paging)");
          // Return only 50 rows
          return [[rows.slice(0, 50)], { rowCount: 50 }];
        }
        // Else OLD path: returns all rows
        console.log("Detected OLD full-scan path");
        // Simulate returning ALL rows
        // Note: In real DB, this is fast (stream), but loading into JS memory is the bottleneck.
        // We simulate the memory load by returning the array.
        return [[rows.slice()], { rowCount: rows.length }];
      }
      return [[], { rowCount: 0 }];
    });

    const req = {
      query: {
        page: "1",
        pageSize: "50",
        branchId: "1",
      },
      authz: { isAllBranches: true },
    };
    const res = {
      json: () => {},
      status: () => res,
    };

    const start = performance.now();
    await syncController.getSyncStores(req, res, (err) => {
      throw err;
    });
    const end = performance.now();

    console.log(`Execution time: ${(end - start).toFixed(2)} ms`);
  });
});
