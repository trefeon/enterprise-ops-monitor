const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { after } = require("node:test");

const servicePath = path.resolve(__dirname, "../../services/afterhoursService.js");
const dataClientPath = path.resolve(__dirname, "../../services/dataClient.js");
const notifyServicePath = path.resolve(__dirname, "../../services/notifyService.js");

function loadAfterhoursService(mocks) {
  delete require.cache[servicePath];
  delete require.cache[dataClientPath];
  delete require.cache[notifyServicePath];

  require.cache[dataClientPath] = {
    id: dataClientPath,
    filename: dataClientPath,
    loaded: true,
    exports: {
      fetchStoreSyncAllBranches: mocks.fetchStoreSyncAllBranches,
      STALE_THRESHOLD_MS: mocks.staleThresholdMs || 10 * 60 * 1000,
    },
  };

  require.cache[notifyServicePath] = {
    id: notifyServicePath,
    filename: notifyServicePath,
    loaded: true,
    exports: {
      notifyAfterhoursAlerts: mocks.notifyAfterhoursAlerts,
    },
  };

  return require("../../services/afterhoursService");
}

function cleanupAfterhoursServiceCache() {
  delete require.cache[servicePath];
  delete require.cache[dataClientPath];
  delete require.cache[notifyServicePath];
}

after(() => {
  cleanupAfterhoursServiceCache();
});

test("runAfterhoursCheck persists and blasts the current stage", async () => {
  const queryLog = [];
  const sequelize = {
    query: async (sql, options = {}) => {
      queryLog.push({ sql, bind: options.bind || [] });
      return [[], null];
    },
  };

  const fetchStoreSyncAllBranches = async () => ({
    rows: [
      {
        storeCode: "3041001",
        storeName: "TOKO A",
        branchId: 2,
        branchName: "NORTH HUB",
        lastSyncAt: "2026-03-31T23:14:20+07:00",
      },
    ],
    fetchedAt: "2026-03-31T23:15:00+07:00",
    branchErrors: {},
  });

  const notifyCalls = [];
  const notifyAfterhoursAlerts = async (violationsByBranch, checkDate, options) => {
    notifyCalls.push({ violationsByBranch, checkDate, options });
    return {
      2: {
        telegram: { ok: true },
        whatsapp: { ok: true },
      },
    };
  };

  const { runAfterhoursCheck } = loadAfterhoursService({
    fetchStoreSyncAllBranches,
    notifyAfterhoursAlerts,
  });

  const result = await runAfterhoursCheck(sequelize, {
    warningType: "initial",
    warningStage: 1,
    totalStages: 4,
    now: new Date("2026-03-31T23:15:00+07:00"),
    scheduledTime: "23:15",
  });

  assert.equal(result.totalViolations, 1);
  assert.equal(result.finalViolations, 0);
  assert.equal(result.branchCount, 1);
  assert.equal(notifyCalls.length, 1);
  assert.equal(notifyCalls[0].checkDate, "2026-03-31");
  assert.equal(
    queryLog.some((entry) => entry.sql.includes("INSERT INTO afterhours_pc_log")),
    true
  );
  assert.equal(
    queryLog.some(
      (entry) =>
        entry.sql.includes("UPDATE afterhours_pc_log") && entry.sql.includes("SET notified = TRUE")
    ),
    true
  );
});
