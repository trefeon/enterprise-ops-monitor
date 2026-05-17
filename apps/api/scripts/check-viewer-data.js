const eodController = require("../controllers/eodController");

async function checkViewerData() {
  console.log("Checking Viewer Data (Scope: 2/North Hub)...");

  const req = {
    query: { page: 1, pageSize: 50 },
    allowedBranches: ["2"], // Viewer updated scope (North Hub)
    user: { username: "viewer" },
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
      console.log("JSON Length:", data.length);
      return this;
    },
    send: function (data) {
      capturedData = data;
      console.log("Send Length:", data.length);
      return this;
    },
  };

  try {
    await eodController.getEODStores(req, res);

    if (capturedData && capturedData.data) {
      console.log(`Results Found: ${capturedData.data.length}`);
      const sample = capturedData.data[0];
      console.log("Sample Row:", JSON.stringify(sample, null, 2));

      const invalid = capturedData.data.filter((r) => String(r.areaId) !== "2");
      if (invalid.length > 0) {
        console.log("❌ FAIL: Found rows from other branches!");
      } else {
        console.log("✅ PASS: Only North Hub rows returned.");
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

checkViewerData();
