const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DATA_API_TIMEOUT_MS = "50";
process.env.DATA_API_RETRY_ATTEMPTS = "2";
process.env.DATA_API_RETRY_BASE_MS = "1";
process.env.DATA_API_RETRY_MAX_MS = "5";
process.env.DATA_API_RETRY_JITTER_MS = "0";

const {
  fetchEodAllBranches,
  fetchStoreSyncAllBranches,
  inferBranchFromStoreCode,
} = require("../../services/dataClient");

function jsonResponse(status, payload, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return headers[String(name).toLowerCase()] || null;
      },
    },
    async text() {
      return typeof payload === "string" ? payload : JSON.stringify(payload);
    },
    async json() {
      return typeof payload === "string" ? JSON.parse(payload) : payload;
    },
  };
}

function parseBranchFromBody(options) {
  return String(JSON.parse(options.body).branch);
}

test("infers branch mapping from store code prefix", () => {
  assert.equal(inferBranchFromStoreCode("3021001")?.id, "2");
  assert.equal(inferBranchFromStoreCode("3031001")?.id, "3");
  assert.equal(inferBranchFromStoreCode("3041001")?.id, "4");
  assert.equal(inferBranchFromStoreCode("3051001")?.id, "5");
  assert.equal(inferBranchFromStoreCode("3061001")?.id, "6");
  assert.equal(inferBranchFromStoreCode("3071001")?.id, "7");
  assert.equal(inferBranchFromStoreCode("3081001")?.id, "8");
  assert.equal(inferBranchFromStoreCode("3091001")?.id, "9");
});

test("store sync reclassifies 307 rows to West Hub even when branch 6 returns latest sync", async (t) => {
  const originalFetch = global.fetch;

  global.fetch = async (_url, options) => {
    const branchId = parseBranchFromBody(options);

    if (branchId === "6") {
      return jsonResponse(200, [
        {
          kodetoko: 3071010,
          namaToko: "DEMO STORE 3071010",
          lastSync: "2026-03-31 23:59:00+07",
        },
      ]);
    }

    if (branchId === "7") {
      return jsonResponse(200, [
        {
          kodetoko: 3071010,
          namaToko: "DEMO STORE 3071010",
          lastSync: "2026-03-31 23:30:00+07",
        },
      ]);
    }

    return jsonResponse(200, []);
  };

  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await fetchStoreSyncAllBranches({ bypassCache: true });
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].storeCode, "3071010");
  assert.equal(result.rows[0].branchId, "7");
  assert.equal(result.rows[0].branchName, "WEST HUB");
});

test("retries retryable 500 per branch and recovers", async (t) => {
  const originalFetch = global.fetch;
  const callsByBranch = new Map();

  global.fetch = async (_url, options) => {
    const branchId = parseBranchFromBody(options);
    callsByBranch.set(branchId, (callsByBranch.get(branchId) || 0) + 1);

    if (branchId === "2" && callsByBranch.get(branchId) === 1) {
      return jsonResponse(500, { error: "temporary upstream failure" });
    }

    return jsonResponse(200, [{ idcabang: branchId, kodetoko: `S-${branchId}` }]);
  };

  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await fetchEodAllBranches({ bypassCache: true });
  assert.equal(result.branchErrors.length, 0);
  assert.equal(callsByBranch.get("2"), 2);
});

test("does not retry non-retryable 400 per branch", async (t) => {
  const originalFetch = global.fetch;
  const callsByBranch = new Map();

  global.fetch = async (_url, options) => {
    const branchId = parseBranchFromBody(options);
    callsByBranch.set(branchId, (callsByBranch.get(branchId) || 0) + 1);

    if (branchId === "2") {
      return jsonResponse(400, { error: "bad request" });
    }

    return jsonResponse(200, [{ idcabang: branchId, kodetoko: `S-${branchId}` }]);
  };

  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await fetchEodAllBranches({ bypassCache: true });
  assert.equal(callsByBranch.get("2"), 1);
  assert.equal(result.branchErrors.length, 1);
  assert.equal(result.branchErrors[0].branchId, "2");
  assert.match(result.branchErrors[0].message, /\(400\)/);
});

test("retries timeout (AbortError) and recovers", async (t) => {
  const originalFetch = global.fetch;
  const callsByBranch = new Map();

  global.fetch = async (_url, options) => {
    const branchId = parseBranchFromBody(options);
    callsByBranch.set(branchId, (callsByBranch.get(branchId) || 0) + 1);

    if (branchId === "3" && callsByBranch.get(branchId) === 1) {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      throw abortError;
    }

    return jsonResponse(200, [{ idcabang: branchId, kodetoko: `S-${branchId}` }]);
  };

  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await fetchEodAllBranches({ bypassCache: true });
  assert.equal(result.branchErrors.length, 0);
  assert.equal(callsByBranch.get("3"), 2);
});
