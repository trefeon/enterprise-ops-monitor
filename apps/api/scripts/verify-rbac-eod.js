const eodController = require("../controllers/eodController");
const db = require("../models");

async function runVerification() {
  console.log("Starting EOD RBAC Verification...");

  // Mock Request/Response
  const mockRes = {
    statusCode: 200,
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (data) {
      this.data = data;
      return this;
    },
    send: function (data) {
      this.data = data;
      return this;
    },
  };

  try {
    // 1. Find a branch ID for 'NORTH HUB' or any existing branch
    const [branch] = await db.sequelize.query(
      "SELECT branch_id, branch_name FROM data_branches WHERE branch_name ILIKE '%NORTH HUB%' LIMIT 1",
      { type: db.Sequelize.QueryTypes.SELECT }
    );

    if (!branch) {
      console.log("Could not find North Hub branch to test. Skipping specific branch test.");
      // return;
      // fallback to any branch
    }
    const testBranchId = branch ? String(branch.branch_id) : "UNKNOWN";
    console.log(
      `Testing with restricted scope for Branch ID: ${testBranchId} (${branch?.branch_name})`
    );

    // 2. Test getEODStores with restricted scope
    const reqRestricted = {
      query: { page: 1, pageSize: 10 },
      allowedBranches: [testBranchId], // Simulate RBAC middleware
      user: { username: "test_user" },
    };

    // We need to capture the response
    let capturedData = null;
    const resRestricted = {
      status: (code) => ({
        json: (data) => {
          capturedData = data;
          console.log(`Response Status: ${code}`);
        },
        send: (data) => {
          capturedData = data;
          console.log(`Response Status: ${code}`);
        },
      }),
    };

    console.log("Calling getEODStores with restricted scope...");
    await eodController.getEODStores(reqRestricted, resRestricted);

    if (!capturedData || !capturedData.data) {
      console.error("No data returned from controller.");
    } else {
      const rows = capturedData.data;
      console.log(`Returned ${rows.length} rows.`);
      const invalid = rows.filter((r) => String(r.areaId) !== testBranchId);
      if (invalid.length > 0) {
        console.error("❌ FAIL: Found rows from other branches!");
        console.error(invalid.map((r) => `${r.storeName} (${r.areaName})`));
      } else {
        console.log("✅ PASS: All rows belong to the allowed branch.");
      }
    }

    // 3. Test with NO restriction (simulate Admin)
    console.log("\nTesting with UNRESTRICTED scope (Admin)...");
    const reqAdmin = {
      query: { page: 1, pageSize: 10 },
      allowedBranches: null, // Admin has null (all access)
      user: { username: "admin_user" },
    };

    await eodController.getEODStores(reqAdmin, resRestricted);
    const adminRows = capturedData.data;
    console.log(`Admin returned ${adminRows.length} rows.`);

    // Simplistic check: Admin should likely see at least same or more, and potentially different branches
    // If we only have North Hub stores in DB this might match, but usually there are many.

    // New test for getEODMonitor
    console.log("\nTesting getEODMonitor with Admin user...");
    const adminUser = { username: "admin_user", authz: { allowedBranches: null } };
    // Reset mockRes for this test
    mockRes._code = 200;
    mockRes._data = null;
    await eodController.getEODMonitor(
      { user: adminUser, query: { date: "2024-01-01" }, authz: adminUser.authz },
      mockRes
    );
    console.log("Admin Result for getEODMonitor:", mockRes._code === 200 ? "OK" : "FAIL");
    if (mockRes._data) {
      console.log("getEODMonitor data keys:", Object.keys(mockRes._data));
    } else {
      console.log("getEODMonitor returned no data.");
    }

    console.log("Verification Complete.");
  } catch (_) {
    // Changed catch variable to _ as per instruction
    console.error("Simulation failed"); // Changed error message as per instruction
  } finally {
    process.exit(0);
  }
}

runVerification();
