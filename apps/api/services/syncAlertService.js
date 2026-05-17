const db = require("../models");

function isExplicitFalse(value) {
  if (value == null) return false;
  const v = String(value).trim().toLowerCase();
  return v === "0" || v === "false" || v === "no" || v === "off";
}

function isEnabled(value, defaultValue = true) {
  if (value == null) return defaultValue;
  return !isExplicitFalse(value);
}

const ALERT_GRACE_MINUTES = Math.max(
  0,
  Number.parseInt(process.env.DATA_SYNC_ALERT_GRACE_MINUTES || "0", 10) || 0
);
const ALERT_COOLDOWN_MINUTES = Math.max(
  0,
  Number.parseInt(process.env.DATA_SYNC_ALERT_COOLDOWN_MINUTES || "60", 10) || 60
);
const ALERT_EXCLUDE_BAZAR = isEnabled(process.env.DATA_SYNC_ALERT_EXCLUDE_BAZAR, true);

function isBazarStoreName(value) {
  if (!value) return false;
  const text = String(value).toLowerCase();
  return text.includes("bazar") || text.includes("bazaar");
}

function buildStoreLabel(row) {
  const code = row?.storeCode ? String(row.storeCode) : "Unknown store";
  const name = row?.storeName ? String(row.storeName) : "";
  return name ? `${code} - ${name}` : code;
}

async function evaluateSyncAlerts(snapshot, { suppress = false } = {}) {
  if (!isEnabled(process.env.DATA_SYNC_ALERTS_ENABLED, true)) {
    return { enabled: false, suppressed: true, alerted: 0, updated: 0 };
  }
  if (!db.SyncAlertState || !db.SystemLog) {
    return { enabled: false, suppressed: true, alerted: 0, updated: 0 };
  }

  const rows = Array.isArray(snapshot?.rows) ? snapshot.rows : [];
  if (rows.length === 0) {
    return { enabled: true, suppressed: Boolean(suppress), alerted: 0, updated: 0 };
  }

  const now = new Date();
  const graceMs = ALERT_GRACE_MINUTES * 60 * 1000;
  const cooldownMs = ALERT_COOLDOWN_MINUTES * 60 * 1000;

  const storeCodes = rows.map((row) => row.storeCode).filter(Boolean);
  if (storeCodes.length === 0) {
    return { enabled: true, suppressed: Boolean(suppress), alerted: 0, updated: 0 };
  }

  const existingStates = await db.SyncAlertState.findAll({
    where: { store_code: storeCodes },
  });
  const stateMap = new Map(existingStates.map((state) => [String(state.store_code), state]));

  const updates = [];
  const triggeredAlerts = [];
  let alerted = 0;
  for (const row of rows) {
    if (!row.storeCode) continue;
    if (row.sourceError) continue;
    const isExcluded = ALERT_EXCLUDE_BAZAR && isBazarStoreName(row.storeName);

    const key = String(row.storeCode);
    const prev = stateMap.get(key);
    const wasProblem = Boolean(prev?.is_problem);
    const isProblem = isExcluded
      ? false
      : Boolean(row.isProblem || row.isMissing || row.isMissingToday);
    const isStale = isExcluded ? false : Boolean(row.isStale);

    let staleSince = prev?.stale_since ? new Date(prev.stale_since) : null;
    let lastAlertedAt = prev?.last_alerted_at ? new Date(prev.last_alerted_at) : null;
    let lastRecoveredAt = prev?.last_recovered_at ? new Date(prev.last_recovered_at) : null;

    if (isProblem) {
      if (!staleSince) staleSince = now;
    } else {
      if (wasProblem) lastRecoveredAt = now;
      staleSince = null;
    }

    const alertReady =
      !suppress &&
      isProblem &&
      staleSince &&
      now.getTime() - staleSince.getTime() >= graceMs &&
      (!lastAlertedAt || now.getTime() - lastAlertedAt.getTime() >= cooldownMs);

    if (alertReady) {
      const staleMinutes = Math.max(0, Math.floor((now.getTime() - staleSince.getTime()) / 60000));
      triggeredAlerts.push({
        storeCode: row.storeCode,
        storeName: row.storeName || null,
        branchId: row.branchId || null,
        branchName: row.branchName || null,
        lastSyncAt: row.lastSyncAt || null,
        staleMinutes,
        reason: row.problemReason || null,
        isMissing: Boolean(row.isMissing),
        isMissingToday: Boolean(row.isMissingToday),
        isProblem: Boolean(row.isProblem),
      });
      lastAlertedAt = now;
      alerted += 1;
    }

    updates.push({
      store_code: key,
      store_name: row.storeName || null,
      branch_id: row.branchId || null,
      branch_name: row.branchName || null,
      is_stale: isStale,
      is_problem: isProblem,
      is_missing_today: Boolean(row.isMissingToday),
      stale_since: staleSince,
      last_seen_at: now,
      last_alerted_at: lastAlertedAt,
      last_recovered_at: lastRecoveredAt,
    });
  }

  if (updates.length > 0) {
    await db.SyncAlertState.bulkCreate(updates, {
      updateOnDuplicate: [
        "store_name",
        "branch_id",
        "branch_name",
        "is_stale",
        "is_problem",
        "is_missing_today",
        "stale_since",
        "last_seen_at",
        "last_alerted_at",
        "last_recovered_at",
      ],
    });
  }
  if (triggeredAlerts.length > 0) {
    const totalProblem = updates.reduce((acc, row) => acc + (row.is_problem ? 1 : 0), 0);
    const totalWarning = updates.reduce(
      (acc, row) => acc + (row.is_stale && !row.is_problem ? 1 : 0),
      0
    );
    const totalNoTimestamp = triggeredAlerts.reduce(
      (acc, row) => acc + (row.reason === "no_timestamp" || row.reason === "missing" ? 1 : 0),
      0
    );

    const examples = triggeredAlerts
      .slice(0, 3)
      .map((row) => buildStoreLabel(row))
      .join(", ");

    const message =
      triggeredAlerts.length === 1
        ? `Late sync detected: ${examples}`
        : `Late sync detected: ${triggeredAlerts.length} stores (examples: ${examples})`;

    await db.SystemLog.create({
      level: "WARNING",
      component: "SYNC",
      message,
      metadata: {
        triggered: triggeredAlerts.length,
        totalProblem,
        totalWarning,
        triggeredNoTimestamp: totalNoTimestamp,
        examples: triggeredAlerts.slice(0, 10),
      },
    });
  }

  return {
    enabled: true,
    suppressed: Boolean(suppress),
    alerted,
    updated: updates.length,
  };
}

module.exports = {
  evaluateSyncAlerts,
};
