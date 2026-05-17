require("dotenv").config();
const { BRANCHES, DATA_SYNC_AUD_API_URL } = require("./services/dataClient");

// Re-implement a simple fetcher to avoid waiting on the cache logic in dataClient
async function postJson(url, payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function runTest() {
  console.log("🚀 Starting Parallel Internal Data Sync Test");
  console.log(`Target: ${DATA_SYNC_AUD_API_URL}`);
  console.log(`Branches: ${BRANCHES.length} (${BRANCHES.map((b) => b.name).join(", ")})`);
  console.log("---------------------------------------------------");

  const start = Date.now();

  // Fire all requests in parallel
  const promises = BRANCHES.map(async (branch) => {
    try {
      const data = await postJson(DATA_SYNC_AUD_API_URL, { branch: String(branch.id) });
      return { branchId: branch.id, branchName: branch.name, data, error: null };
    } catch (err) {
      return { branchId: branch.id, branchName: branch.name, data: null, error: err.message };
    }
  });

  const results = await Promise.all(promises);
  const duration = ((Date.now() - start) / 1000).toFixed(2);

  console.log(`\n✅ Finished in ${duration}s`);
  console.log("---------------------------------------------------");

  // Analysis
  const failures = results.filter((r) => r.error);
  const successes = results.filter((r) => !r.error);

  console.log(`Success: ${successes.length}/${BRANCHES.length}`);
  console.log(`Failed:  ${failures.length}/${BRANCHES.length}`);

  if (failures.length > 0) {
    console.log("\n❌ Failures:");
    failures.forEach((f) => console.log(`   - ${f.branchName} (${f.branchId}): ${f.error}`));
  }

  // Check for Cross-Branch Duplication (The critical bug)
  console.log("\n🔍 Checking for Data Corruption (Cross-Branch Duplication)...");

  const payloadMap = new Map(); // stringified_data -> [branch_names]
  let corruptionFound = false;

  for (const res of successes) {
    // We normalize by stringifying the data array to detect exact matches
    const signature = JSON.stringify(res.data);

    // Ignore empty arrays (common and harmless if multiple branches have no data)
    if (signature === "[]" || signature === '{"data":[]}') continue;

    if (payloadMap.has(signature)) {
      payloadMap.get(signature).push(res.branchName);
    } else {
      payloadMap.set(signature, [res.branchName]);
    }
  }

  payloadMap.forEach((branches, sig) => {
    if (branches.length > 1) {
      corruptionFound = true;
      console.error(
        `\n⚠️  CRITICAL WARNING: Duplicate data received for branches: ${branches.join(", ")}`
      );
      console.error(`   Sample Data Snippet: ${sig.substring(0, 100)}...`);
    }
  });

  if (!corruptionFound) {
    console.log("✅ No cross-branch duplication detected.");
  } else {
    console.log("\n❌ TEST FAILED: Parallel requests caused data corruption.");
  }

  // Summary
  if (failures.length === 0 && !corruptionFound) {
    console.log("\n🎉 TEST PASSED: It appears safe to enable parallel fetching.");
  } else {
    console.log("\n🚫 TEST FAILED: Do not enable parallel fetching.");
  }
}

runTest();
