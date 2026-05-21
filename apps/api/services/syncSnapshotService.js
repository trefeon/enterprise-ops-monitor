const { Op } = require("sequelize");
const db = require("../models");
const {
  fetchStoreSyncAllBranches,
  BRANCHES,
  STALE_THRESHOLD_MS,
  inferBranchFromStoreCode,
} = require("./dataClient");
const { evaluateSyncAlerts } = require("./syncAlertService");
const dataDb = require("./dataDb");
const { fetchEodAllBranches } = require("./dataSource");
const { toWibDate } = require("../utils/time");

const SYNCED_MAX_SEC = 300; // 5 min: synced threshold
const STALE_MAX_SEC = 600; // 10 min: stale threshold

const MAX_HISTORY_MINUTES = Math.max(
  1,
  Number.parseInt(process.env.DATA_SYNC_LOG_RETENTION_MINUTES || "30", 10) || 30
);
const HISTORY_RETENTION_MS = MAX_HISTORY_MINUTES * 60 * 1000;
const BASELINE_CACHE_TTL_MS = Number.parseInt(
  process.env.DATA_SYNC_BASELINE_CACHE_TTL_MS || "600000",
  10
);
const SUMMARY_BUCKET_MINUTES_RAW = Number.parseInt(
  process.env.DATA_SYNC_SUMMARY_BUCKET_MINUTES || "10",
  10
);
const SUMMARY_BUCKET_MINUTES = [10, 30, 60].includes(SUMMARY_BUCKET_MINUTES_RAW)
  ? SUMMARY_BUCKET_MINUTES_RAW
  : 10;
const SUMMARY_BUCKET_MS = SUMMARY_BUCKET_MINUTES * 60 * 1000;
const STALE_WARNING_MS = Math.max(
  60_000,
  Number.parseInt(process.env.DATA_SYNC_STALE_WARNING_MS || "300000", 10) || 300000
);
const PROBLEM_THRESHOLD_MS = Math.max(STALE_WARNING_MS, STALE_THRESHOLD_MS);
const SUMMARY_RETENTION_DAYS = Math.max(
  1,
  Number.parseInt(process.env.DATA_SYNC_SUMMARY_RETENTION_DAYS || "30", 10) || 30
);
const SOURCE_MAX_ERRORS = Math.max(
  0,
  Number.parseInt(process.env.DATA_SYNC_SOURCE_MAX_ERRORS || "2", 10) || 2
);
const ALLOWED_SUMMARY_BUCKETS = new Set([10, 30, 60]);

const LIVE_SYNC_FETCH_ENABLED = (() => {
  const raw = process.env.DATA_SYNC_ALLOW_LIVE_FETCH;
  if (raw == null) return false;
  const v = String(raw).trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
})();

let baselineCache = { stores: null, fetchedAt: 0 };
const BRANCH_BY_ID = new Map(BRANCHES.map((branch) => [String(branch.id), branch]));

function applyScopeFilters(snapshot, allowedBranches) {
  if (!snapshot) return snapshot;

  // If allowedBranches is null, it means ALL ACCESS (admin/superadmin). Return snapshot as is.
  if (allowedBranches === null) return snapshot;

  if (!Array.isArray(snapshot.rows)) return snapshot;

  const rows = snapshot.rows.filter(
    (row) => row.branchId && allowedBranches.includes(String(row.branchId))
  );

  let synced = 0,
    stale = 0,
    problem = 0,
    late = 0,
    noTimestamp = 0;
  for (const row of rows) {
    if (row.status === "synced") synced++;
    else if (row.status === "stale") stale++;
    else problem++;
    if (row.problemReason === "late") late++;
    if (row.problemReason === "no_timestamp" || row.problemReason === "missing") noTimestamp++;
  }

  return {
    ...snapshot,
    total: rows.length,
    synced,
    stale,
    problem,
    late,
    noTimestamp,
    rows,
    orphaned: 0,
  };
}

function parseBooleanQuery(value) {
  if (value == null) return false;
  const v = String(value).trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function applySnapshotFilters(snapshot, { excludeBazar = false } = {}) {
  if (!snapshot) return snapshot;

  let filteredRows = snapshot.rows || [];

  const SEVEN_DAYS_SEC = 604800; // 7 * 24 * 3600 seconds
  filteredRows = filteredRows.filter((row) => {
    const age = row.lastSyncAgoSec;
    return age != null && age <= SEVEN_DAYS_SEC;
  });

  if (excludeBazar) {
    filteredRows = filteredRows.filter((row) => {
      const storeName = row?.storeName || row?.store_name || row?.namaToko || row?.nama_toko;
      if (!storeName) return true;
      const text = String(storeName).toLowerCase();
      return !(text.includes("bazar") || text.includes("bazaar"));
    });
  }

  if (filteredRows.length === 0) {
    return {
      ...snapshot,
      total: 0,
      synced: 0,
      stale: 0,
      problem: 0,
      late: 0,
      noTimestamp: 0,
      rows: [],
    };
  }

  let synced = 0;
  let stale = 0;
  let problem = 0;
  let late = 0;
  let noTimestamp = 0;

  for (const row of filteredRows) {
    if (row.status === "synced") synced += 1;
    else if (row.status === "stale") stale += 1;
    else problem += 1;

    if (row.problemReason === "late") late += 1;
    if (row.problemReason === "no_timestamp" || row.problemReason === "missing") noTimestamp += 1;
  }

  return {
    ...snapshot,
    total: filteredRows.length,
    synced,
    stale,
    problem,
    late,
    noTimestamp,
    rows: filteredRows,
  };
}

async function countActiveStoresMaster({ excludeBazar = false } = {}) {
  if (!db?.sequelize) return null;
  if (excludeBazar) return null;

  try {
    const [rows] = await db.sequelize.query(
      `SELECT COUNT(*)::int AS total FROM stores_master WHERE is_active = TRUE;`
    );
    const total = rows?.[0]?.total != null ? Number.parseInt(String(rows[0].total), 10) : null;
    return Number.isFinite(total) ? total : null;
  } catch {
    return null;
  }
}

async function upsertSyncAudLatest(rows, fetchedAt) {
  if (!db?.sequelize) return { upserted: 0 };
  if (!Array.isArray(rows) || rows.length === 0) return { upserted: 0 };

  const fetchedAtDate = fetchedAt instanceof Date ? fetchedAt : new Date(fetchedAt);
  if (Number.isNaN(fetchedAtDate.getTime())) return { upserted: 0 };

  const byStore = new Map();
  for (const row of rows) {
    const storeCodeRaw = row?.storeCode != null ? String(row.storeCode).trim() : "";
    const kodetoko = storeCodeRaw ? Number.parseInt(storeCodeRaw, 10) : NaN;
    if (!Number.isFinite(kodetoko)) continue;

    const inferred = inferBranchFromStoreCode(storeCodeRaw);
    const branchId = inferred?.id || (row?.branchId != null ? String(row.branchId) : null);
    if (!branchId) continue;

    const lastSyncAt = row?.lastSyncAt ? new Date(row.lastSyncAt) : null;
    const lastSyncAtMs =
      lastSyncAt && !Number.isNaN(lastSyncAt.getTime()) ? lastSyncAt.getTime() : null;
    const lastSyncEpoch = lastSyncAtMs != null ? Math.floor(lastSyncAtMs / 1000) : null;

    const existing = byStore.get(kodetoko);
    if (!existing || (lastSyncEpoch || 0) > (existing.lastSyncEpoch || 0)) {
      byStore.set(kodetoko, {
        kodetoko,
        branchId,
        namaToko: row?.storeName || null,
        lastSyncEpoch,
      });
    }
  }

  const values = Array.from(byStore.values());
  if (values.length === 0) return { upserted: 0 };

  const kodeTokos = values.map((v) => v.kodetoko);
  const branchIds = values.map((v) => v.branchId);
  const namaTokos = values.map((v) => v.namaToko);
  const lastSyncEpochs = values.map((v) => v.lastSyncEpoch);
  const fetchedAts = values.map(() => fetchedAtDate);
  const updatedAts = values.map(() => fetchedAtDate);

  await db.sequelize.query(
    `
      INSERT INTO sync_aud_latest (
        kodetoko, branch_id, nama_toko, last_sync_epoch, source_fetched_at, updated_at
      )
      SELECT * FROM UNNEST(
        $1::bigint[],
        $2::text[],
        $3::text[],
        $4::bigint[],
        $5::timestamptz[],
        $6::timestamptz[]
      )
      ON CONFLICT (kodetoko) DO UPDATE SET
        branch_id = EXCLUDED.branch_id,
        nama_toko = COALESCE(EXCLUDED.nama_toko, sync_aud_latest.nama_toko),
        last_sync_epoch = EXCLUDED.last_sync_epoch,
        source_fetched_at = EXCLUDED.source_fetched_at,
        updated_at = EXCLUDED.updated_at;
    `,
    {
      bind: [kodeTokos, branchIds, namaTokos, lastSyncEpochs, fetchedAts, updatedAts],
    }
  );

  return { upserted: values.length };
}

async function rebuildSnapshotFromMaster(now = new Date()) {
  if (!db?.sequelize) return { rebuilt: 0 };

  const nowEpoch = Math.floor(now.getTime() / 1000);

  const [rows] = await db.sequelize.query(
    `
      WITH active_master AS (
        SELECT kodetoko, branch_id, nama_toko, area, regional
        FROM stores_master
        WHERE is_active = TRUE
      )
      INSERT INTO store_sync_snapshot (
        kodetoko,
        branch_id,
        nama_toko,
        last_sync_epoch,
        age_sec,
        status,
        updated_at
      )
      SELECT
        m.kodetoko,
        m.branch_id,
        COALESCE(m.nama_toko, l.nama_toko) AS nama_toko,
        l.last_sync_epoch,
        CASE
          WHEN l.last_sync_epoch IS NULL THEN NULL
          ELSE GREATEST(0, ($1::bigint - l.last_sync_epoch))::int
        END AS age_sec,
        CASE
          WHEN l.last_sync_epoch IS NULL THEN 'problem'
          WHEN ($1::bigint - l.last_sync_epoch) <= $2::int THEN 'synced'
          WHEN ($1::bigint - l.last_sync_epoch) <= $3::int THEN 'stale'
          ELSE 'problem'
        END AS status,
        now() AS updated_at
      FROM active_master m
      LEFT JOIN sync_aud_latest l
        ON l.kodetoko = m.kodetoko
      ON CONFLICT (kodetoko) DO UPDATE SET
        branch_id = EXCLUDED.branch_id,
        nama_toko = COALESCE(EXCLUDED.nama_toko, store_sync_snapshot.nama_toko),
        last_sync_epoch = EXCLUDED.last_sync_epoch,
        age_sec = EXCLUDED.age_sec,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
      RETURNING 1;
    `,
    {
      bind: [nowEpoch, SYNCED_MAX_SEC, STALE_MAX_SEC],
    }
  );

  await db.sequelize.query(
    `
      DELETE FROM store_sync_snapshot s
      WHERE NOT EXISTS (
        SELECT 1 FROM stores_master m
        WHERE m.is_active = TRUE AND m.kodetoko = s.kodetoko
      );
    `
  );

  return { rebuilt: Array.isArray(rows) ? rows.length : 0 };
}

function isTestEnv() {
  return process.env.NODE_ENV === "test";
}

function isSyncTestMode() {
  const raw = process.env.DATA_SYNC_TEST_MODE;
  if (raw == null) return isTestEnv();
  const v = String(raw).trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function computeSnapshotStatus({ lastSyncAtMs, fetchedAtMs }) {
  if (!lastSyncAtMs || !Number.isFinite(lastSyncAtMs)) return "problem";

  const ageSec = Math.max(0, Math.floor((fetchedAtMs - lastSyncAtMs) / 1000));
  if (ageSec <= SYNCED_MAX_SEC) return "synced";
  if (ageSec <= STALE_MAX_SEC) return "stale";
  return "problem";
}

function parseSyncDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function applySyncFlags(rows, now) {
  const enriched = [];
  let synced = 0;
  let stale = 0;
  let problem = 0;
  let late = 0;
  let noTimestamp = 0;

  for (const row of rows || []) {
    const lastSyncDate = parseSyncDate(row.lastSyncAt);
    const ageMs = lastSyncDate ? now.getTime() - lastSyncDate.getTime() : null;

    const lastSyncAgoSec = ageMs == null ? null : Math.max(0, Math.floor(ageMs / 1000));
    const status = computeSnapshotStatus({
      lastSyncAtMs: lastSyncDate ? lastSyncDate.getTime() : null,
      fetchedAtMs: now.getTime(),
    });

    if (status === "synced") synced += 1;
    else if (status === "stale") stale += 1;
    else problem += 1;

    const reason =
      ageMs == null
        ? row.isMissing
          ? "missing"
          : "no_timestamp"
        : lastSyncAgoSec > STALE_MAX_SEC
          ? "late"
          : lastSyncAgoSec > SYNCED_MAX_SEC
            ? "stale"
            : "ok";

    if (reason === "late") late += 1;
    if (reason === "no_timestamp" || reason === "missing") noTimestamp += 1;

    const isProblem = status === "problem";
    const isStale = status === "stale";

    enriched.push({
      ...row,
      lastSyncAgoSec,
      problemReason: reason,
      isStale,
      isProblem,
      isSynced: !isProblem,
      status,
    });
  }

  return {
    rows: enriched,
    counts: {
      total: enriched.length,
      synced,
      stale,
      problem,
      late,
      noTimestamp,
    },
  };
}

function buildBranchStats(rows, allowedBranches) {
  const branchStats = new Map();
  for (const branch of BRANCHES) {
    if (allowedBranches !== null) {
      if (!allowedBranches.includes(String(branch.id))) continue;
    }
    branchStats.set(String(branch.id), {
      id: String(branch.id),
      name: branch.name,
      total: 0,
      synced: 0,
      stale: 0,
      problem: 0,
    });
  }

  for (const row of rows) {
    if (!row.branchId) continue;
    const key = String(row.branchId);

    if (allowedBranches !== null && !allowedBranches.includes(key)) continue;

    if (!branchStats.has(key)) {
      if (allowedBranches !== null && !allowedBranches.includes(key)) continue;

      branchStats.set(key, {
        id: key,
        name: row.branchName || key,
        total: 0,
        synced: 0,
        stale: 0,
        problem: 0,
      });
    }
    const stat = branchStats.get(key);
    stat.total++;
    if (row.status === "problem") stat.problem++;
    else if (row.status === "stale") stat.stale++;
    else stat.synced++;
  }

  return Array.from(branchStats.values());
}

function normalizeBaselineStores(rows) {
  const baselineMap = new Map();
  for (const row of rows || []) {
    const storeCode = row.storeCode ? String(row.storeCode) : null;
    if (!storeCode) continue;
    if (baselineMap.has(storeCode)) continue;
    let branchId = row.branchId ? String(row.branchId) : null;
    let branchName = row.branchName || null;
    if (!branchId) {
      const inferred = inferBranchFromStoreCode(storeCode);
      if (inferred) {
        branchId = inferred.id;
        branchName = branchName || inferred.name;
      }
    }
    if (branchId && !branchName) {
      branchName = BRANCH_BY_ID.get(branchId)?.name || branchName;
    }
    baselineMap.set(storeCode, {
      storeCode,
      storeName: row.storeName || null,
      branchId,
      branchName,
    });
  }
  return Array.from(baselineMap.values());
}

function mergeSyncWithBaseline(syncRows, baselineRows) {
  const syncMap = new Map();
  for (const row of syncRows || []) {
    if (!row.storeCode) continue;
    const storeCode = String(row.storeCode);
    const existing = syncMap.get(storeCode);
    if (!existing) {
      syncMap.set(storeCode, row);
      continue;
    }
    const existingTime = existing.lastSyncAt ? new Date(existing.lastSyncAt) : null;
    const nextTime = row.lastSyncAt ? new Date(row.lastSyncAt) : null;
    if (nextTime && (!existingTime || nextTime > existingTime)) {
      syncMap.set(storeCode, row);
    }
  }

  const baseline = normalizeBaselineStores(baselineRows);
  if (baseline.length === 0) {
    const rows = Array.from(syncMap.values());
    return {
      rows,
      total: rows.length,
      missing: 0,
      orphaned: 0,
    };
  }

  let missing = 0;
  let matched = 0;
  const merged = [];
  for (const store of baseline) {
    const syncRow = syncMap.get(store.storeCode);
    if (syncRow) {
      matched++;
      merged.push({
        ...syncRow,
        storeName: syncRow.storeName || store.storeName,
        branchId: syncRow.branchId || store.branchId,
        branchName: syncRow.branchName || store.branchName,
        isMissingToday: Boolean(syncRow.isMissingToday),
        isMissing: false,
      });
    } else {
      missing++;
      merged.push({
        storeCode: store.storeCode,
        storeName: store.storeName,
        branchId: store.branchId,
        branchName: store.branchName,
        lastSyncAt: null,
        lastSyncAgoSec: null,
        isMissingToday: true,
        isMissing: true,
      });
    }
  }

  const orphaned = Math.max(0, syncMap.size - matched);
  return {
    rows: merged,
    total: merged.length,
    missing,
    orphaned,
  };
}

async function fetchBaselineStores() {
  if (process.env.NODE_ENV === "test") return null;
  const now = Date.now();
  if (baselineCache.stores && now - baselineCache.fetchedAt < BASELINE_CACHE_TTL_MS) {
    return baselineCache.stores;
  }

  try {
    const stores = await dataDb.fetchStoresAll();
    if (Array.isArray(stores) && stores.length > 0) {
      baselineCache = { stores, fetchedAt: now };
      return stores;
    }
  } catch (err) {
    console.warn(
      "[syncSnapshotService] Baseline store fetch failed (data_stores):",
      err?.message || err
    );
  }

  try {
    const { rows } = await fetchEodAllBranches();
    const baseline = normalizeBaselineStores(rows || []);
    if (baseline.length > 0) {
      baselineCache = { stores: baseline, fetchedAt: now };
      return baseline;
    }
  } catch (err) {
    console.warn("[syncSnapshotService] Baseline store fetch failed (EOD):", err?.message || err);
  }

  if (baselineCache.stores) {
    return baselineCache.stores;
  }

  return null;
}

async function loadSyncSnapshot(options = {}) {
  const data = await fetchStoreSyncAllBranches(options);
  const mergeBaseline = options.mergeBaseline !== false;

  const baselineStores = mergeBaseline ? await fetchBaselineStores() : null;
  const merged = mergeBaseline
    ? mergeSyncWithBaseline(data.rows || [], baselineStores)
    : { rows: data.rows || [], total: (data.rows || []).length, missing: 0, orphaned: 0 };
  const now = new Date();
  const flagged = applySyncFlags(merged.rows || [], now);

  const branchErrors = Array.isArray(data.branchErrors) ? data.branchErrors : [];
  const errorBranchIds = new Set(branchErrors.map((err) => String(err.branchId || "")));
  const rows = (flagged.rows || []).map((row) => ({
    ...row,
    sourceError: row.branchId ? errorBranchIds.has(String(row.branchId)) : false,
  }));
  const source = {
    ok: branchErrors.length <= SOURCE_MAX_ERRORS,
    errorCount: branchErrors.length,
    maxErrors: SOURCE_MAX_ERRORS,
    totalBranches: BRANCHES.length,
    errors: branchErrors,
  };

  return {
    total: flagged.counts.total,
    synced: flagged.counts.synced,
    stale: flagged.counts.stale,
    problem: flagged.counts.problem,
    missing: 0,
    missingToday: 0,
    late: flagged.counts.late,
    noTimestamp: flagged.counts.noTimestamp,
    orphaned: merged.orphaned,
    rows,
    fetchedAt: data.fetchedAt,
    source,
    asOf: now.toISOString(),
  };
}

async function loadCachedSyncSnapshotFromDb() {
  if (!db?.sequelize) return null;

  try {
    const [metaRows] = await db.sequelize.query(
      `SELECT MAX(updated_at) AS updated_at, COUNT(*)::int AS total FROM store_sync_snapshot;`
    );
    const meta = Array.isArray(metaRows) ? metaRows[0] : null;
    const total = meta?.total != null ? Number.parseInt(String(meta.total), 10) : 0;
    const updatedAtRaw = meta?.updated_at || null;
    const updatedAt = updatedAtRaw ? new Date(updatedAtRaw) : null;
    if (!total || !updatedAt || Number.isNaN(updatedAt.getTime())) return null;

    const [rows] = await db.sequelize.query(
      `
        SELECT
          branch_id, kodetoko, nama_toko, last_sync_epoch, age_sec, status, updated_at
        FROM store_sync_snapshot
        ORDER BY kodetoko ASC;
      `
    );

    const enriched = [];
    const now = new Date();

    for (const r of rows || []) {
      const branchId = r?.branch_id != null ? String(r.branch_id) : null;
      const storeCode = r?.kodetoko != null ? String(r.kodetoko) : null;
      if (!branchId || !storeCode) continue;

      const lastSyncEpoch =
        r?.last_sync_epoch != null ? Number.parseInt(String(r.last_sync_epoch), 10) : null;
      const lastSyncAt = Number.isFinite(lastSyncEpoch)
        ? new Date(lastSyncEpoch * 1000).toISOString()
        : null;

      enriched.push({
        storeCode,
        storeName: r?.nama_toko || null,
        branchId,
        branchName: BRANCH_BY_ID.get(branchId)?.name || branchId,
        lastSyncAt,
        isMissing: false,
        sourceError: false,
        lastSyncEpoch: Number.isFinite(lastSyncEpoch) ? lastSyncEpoch : null,
      });
    }

    const flagged = applySyncFlags(enriched, now);

    return {
      total: flagged.counts.total,
      synced: flagged.counts.synced,
      stale: flagged.counts.stale,
      problem: flagged.counts.problem,
      missing: 0,
      orphaned: 0,
      late: flagged.counts.late,
      noTimestamp: flagged.counts.noTimestamp,
      rows: flagged.rows,
      fetchedAt: updatedAt.toISOString(),
      source: {
        ok: true,
        errorCount: 0,
        maxErrors: SOURCE_MAX_ERRORS,
        totalBranches: BRANCHES.length,
        errors: [],
        cached: true,
      },
      asOf: now.toISOString(),
    };
  } catch (err) {
    console.warn("[syncSnapshotService] Failed to load cached snapshot:", err?.message || err);
    return null;
  }
}

function getWibDayRange(dateStr) {
  const start = new Date(`${dateStr}T00:00:00+07:00`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function mapSummaryRow(row) {
  const bucketStart = row.bucket_start;
  const bucketEnd = new Date(new Date(bucketStart).getTime() + SUMMARY_BUCKET_MS);
  return {
    bucketStart,
    bucketEnd,
    lastSyncAt: row.last_sync_at,
    isStale: row.is_stale,
    isProblem: row.is_problem,
    isMissingToday: row.is_missing_today,
    polledAt: row.polled_at,
  };
}

function aggregateSummaryBuckets(rows, dayStart, bucketMinutes) {
  if (bucketMinutes === SUMMARY_BUCKET_MINUTES) return rows;
  const bucketMs = bucketMinutes * 60 * 1000;
  const startMs = dayStart.getTime();
  const grouped = new Map();

  for (const row of rows) {
    const bucketStartMs = new Date(row.bucketStart).getTime();
    const offset = Math.floor((bucketStartMs - startMs) / bucketMs);
    if (offset < 0) continue;
    const groupStartMs = startMs + offset * bucketMs;
    const existing = grouped.get(groupStartMs);
    if (!existing || bucketStartMs >= new Date(existing.bucketStart).getTime()) {
      grouped.set(groupStartMs, {
        ...row,
        bucketStart: new Date(groupStartMs),
        bucketEnd: new Date(groupStartMs + bucketMs),
      });
    }
  }

  return Array.from(grouped.values()).sort(
    (a, b) => new Date(a.bucketStart) - new Date(b.bucketStart)
  );
}

async function pollAndPersistSync() {
  const startedAt = new Date();
  try {
    const snapshot = await loadSyncSnapshot({ bypassCache: true, mergeBaseline: false });

    if (!snapshot.rows || snapshot.rows.length === 0) {
      console.log("[syncSnapshotService] No sync data to persist");
      return { persisted: 0, deleted: 0 };
    }

    const records = snapshot.rows.map((row) => ({
      store_code: row.storeCode,
      store_name: row.storeName,
      branch_id: row.branchId,
      branch_name: row.branchName,
      last_sync_at: row.lastSyncAt ? new Date(row.lastSyncAt) : null,
      is_stale: row.isStale,
      is_problem: row.isProblem,
      is_missing_today: row.isMissingToday,
      polled_at: startedAt,
    }));

    await db.SyncLog.bulkCreate(records);

    let latestUpserted = 0;
    let snapshotRebuilt = 0;
    try {
      const res = await upsertSyncAudLatest(snapshot.rows, startedAt);
      latestUpserted = res?.upserted || 0;
      const rebuilt = await rebuildSnapshotFromMaster(startedAt);
      snapshotRebuilt = rebuilt?.rebuilt || 0;
    } catch (err) {
      console.warn(
        "[syncSnapshotService] Sync snapshot rebuild failed (non-fatal):",
        err?.message || err
      );
    }

    const cutoff = new Date(Date.now() - HISTORY_RETENTION_MS);
    const deleted = await db.SyncLog.destroy({
      where: { polled_at: { [Op.lt]: cutoff } },
    });

    let summaryDeleted = 0;
    if (db.SyncSummary) {
      const dayKey = toWibDate(startedAt);
      const range = dayKey ? getWibDayRange(dayKey) : null;
      const dayStart = range?.start ? range.start.getTime() : startedAt.getTime();
      const offsetMs = Math.max(0, startedAt.getTime() - dayStart);
      const bucketStart = new Date(
        dayStart + Math.floor(offsetMs / SUMMARY_BUCKET_MS) * SUMMARY_BUCKET_MS
      );
      const summaryRows = snapshot.rows.map((row) => ({
        store_code: row.storeCode,
        store_name: row.storeName,
        branch_id: row.branchId,
        branch_name: row.branchName,
        bucket_start: bucketStart,
        bucket_minutes: SUMMARY_BUCKET_MINUTES,
        last_sync_at: row.lastSyncAt ? new Date(row.lastSyncAt) : null,
        is_stale: row.isStale,
        is_problem: row.isProblem,
        is_missing_today: row.isMissingToday,
        polled_at: startedAt,
      }));

      await db.SyncSummary.bulkCreate(summaryRows, {
        updateOnDuplicate: [
          "store_name",
          "branch_id",
          "branch_name",
          "last_sync_at",
          "is_stale",
          "is_problem",
          "is_missing_today",
          "polled_at",
          "bucket_minutes",
        ],
      });

      const summaryCutoff = new Date(Date.now() - SUMMARY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      summaryDeleted = await db.SyncSummary.destroy({
        where: { bucket_start: { [Op.lt]: summaryCutoff } },
      });
    }

    let alertSummary = null;
    try {
      const suppressAlerts = snapshot.source && snapshot.source.ok === false;
      alertSummary = await evaluateSyncAlerts(snapshot, { suppress: suppressAlerts });
    } catch (err) {
      console.warn("[syncSnapshotService] Sync alert evaluation failed:", err?.message || err);
    }

    return {
      persisted: records.length,
      stale: snapshot.stale,
      problem: snapshot.problem,
      deleted,
      summaryDeleted,
      latestUpserted,
      snapshotRebuilt,
      at: startedAt.toISOString(),
      alerts: alertSummary,
    };
  } catch (err) {
    console.error("[syncSnapshotService] pollAndPersistSync error:", err.message);
    throw err;
  }
}

module.exports = {
  SYNCED_MAX_SEC,
  STALE_MAX_SEC,
  MAX_HISTORY_MINUTES,
  HISTORY_RETENTION_MS,
  BASELINE_CACHE_TTL_MS,
  SUMMARY_BUCKET_MINUTES_RAW,
  SUMMARY_BUCKET_MINUTES,
  SUMMARY_BUCKET_MS,
  STALE_WARNING_MS,
  PROBLEM_THRESHOLD_MS,
  SUMMARY_RETENTION_DAYS,
  SOURCE_MAX_ERRORS,
  ALLOWED_SUMMARY_BUCKETS,
  LIVE_SYNC_FETCH_ENABLED,

  isTestEnv,
  isSyncTestMode,
  computeSnapshotStatus,
  parseSyncDate,
  applySyncFlags,
  buildBranchStats,
  normalizeBaselineStores,
  mergeSyncWithBaseline,
  fetchBaselineStores,
  loadSyncSnapshot,
  loadCachedSyncSnapshotFromDb,
  rebuildSnapshotFromMaster,
  upsertSyncAudLatest,
  applySnapshotFilters,
  applyScopeFilters,
  parseBooleanQuery,
  countActiveStoresMaster,
  getWibDayRange,
  mapSummaryRow,
  aggregateSummaryBuckets,
  pollAndPersistSync,
};
