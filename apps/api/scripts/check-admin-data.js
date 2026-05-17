const eodController = require("../controllers/eodController");
const { getAllowedBranches } = require("../services/authzService");

async function checkAdminData() {
  console.log("Checking Admin Data (Scope: ALL/null)...");

  // Simulate Env Admin (synthetic)
  const authz = {
    userId: "env_admin",
    roleNames: ["super_admin"],
    rolePerms: [], // irrelevant for this test
    overridesAllow: [],
    overridesDeny: [],
    effectivePerms: [],
    scopeBranches: [],
    isAllBranches: true,
  };

  const allowed = getAllowedBranches(authz);
  console.log("getAllowedBranches(authz) Result:", allowed);

  const req = {
    query: { page: 1, pageSize: 10 },
    allowedBranches: allowed, // Should be null
    authz: authz,
    user: { username: "superadmin" },
  };

  let capturedData = null;
  const res = {
    statusCode: 200,
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (data) {
      capturedData = data;
      return this;
    },
    send: function (data) {
      capturedData = data;
      return this;
    },
  };

  try {
    await eodController.getEODStores(req, res);

    if (capturedData && capturedData.data) {
      console.log(`Results Found: ${capturedData.data.length}`);
      const rows = capturedData.data;
      if (rows.length > 0) {
        const branches = new Set(rows.map((r) => r.areaName));
        console.log("Branches found:", Array.from(branches));
        console.log("✅ PASS: Data returned for Admin.");
      } else {
        console.log("⚠️ Warning: Admin sees 0 rows.");
      }
    } else {
      console.log("❌ FAIL: No data returned or empty.");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

checkAdminData();
