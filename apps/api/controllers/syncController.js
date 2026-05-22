const { Op } = require("sequelize");
const db = require("../models");
const { ok, fail } = require("../utils/response");
const { invalidateSyncCache, BRANCHES, getBranchNameById } = require("../services/dataClient");
const { toWibDate, toWibIso } = require("../utils/time");
const { getAllowedBranches } = require("../services/authzService");
const { ensureBranchAccessForBranchId, ensureStoreBranchAccess } = require("../middleware/rbac");

const syncSnapshotService = require("../services/syncSnapshotService");
const {
  SYNCED_MAX_SEC,
  STALE_MAX_SEC,
  MAX_HISTORY_MINUTES,
  SUMMARY_BUCKET_MINUTES,
  STALE_WARNING_MS,
  PROBLEM_THRESHOLD_MS,
  ALLOWED_SUMMARY_BUCKETS,
  LIVE_SYNC_FETCH_ENABLED,
  SOURCE_MAX_ERRORS,

  isSyncTestMode,
  buildBranchStats,
  loadSyncSnapshot,
  loadCachedSyncSnapshotFromDb,
  countActiveStoresMaster,
  applySnapshotFilters,
  applyScopeFilters,
  parseBooleanQuery,
  getWibDayRange,
  mapSummaryRow,
  aggregateSummaryBuckets,
} = syncSnapshotService;

function isOptimizedSnapshotSchemaError(err) {
  const code = String(err?.original?.code || err?.parent?.code || err?.code || "");
  if (code === "42P01" || code === "42703") return true;

  const message = String(err?.message || err?.original?.message || err?.parent?.message || "")
    .toLowerCase()
    .trim();

  return (
    message.includes("store_sync_snapshot") &&
    (message.includes("does not exist") ||
      message.includes("relation") ||
      message.includes("column") ||
      message.includes("undefined"))
  );
}

/**
 * GET /api/sync/summary
 * New stable summary contract for the dashboard (cached only).
 */
async function getSyncSummary(req, res, next) {
  try {
    const excludeBazar = parseBooleanQuery(req.query.excludeBazar);
    const allowedBranches = getAllowedBranches(req.authz);

    if (isSyncTestMode()) {
      const snapshotRaw = await loadSyncSnapshot({ mergeBaseline: false });
      let snapshot = applySnapshotFilters(snapshotRaw, { excludeBazar });
      snapshot = applyScopeFilters(snapshot, allowedBranches);
      const updatedAt = toWibIso(snapshot.fetchedAt) || snapshot.fetchedAt;
      return ok(
        res,
        {
          totalStores: snapshot.total,
          synced: snapshot.synced,
          stale: snapshot.stale,
          problem: snapshot.problem,
          thresholdsSec: { syncedMax: SYNCED_MAX_SEC, staleMax: STALE_MAX_SEC },
          oldest: { kodetoko: null, namaToko: "", ageSec: null, lastSyncEpoch: null },
        },
        {
          updatedAt,
          snapshotAgeSec: 0,
        }
      );
    }

    const totalMaster = await countActiveStoresMaster({ excludeBazar });
    const snapshotRaw = await loadCachedSyncSnapshotFromDb();
    let snapshot = applySnapshotFilters(snapshotRaw, { excludeBazar });
    snapshot = applyScopeFilters(snapshot, allowedBranches);

    if (!snapshot) {
      return fail(
        res,
        503,
        "SYNC_SNAPSHOT_EMPTY",
        "No cached sync snapshot available yet. Wait for the scheduler poll."
      );
    }

    const snapshotMs = new Date(snapshot.fetchedAt).getTime();
    const snapshotAgeSec = Number.isFinite(snapshotMs)
      ? Math.max(0, Math.floor((Date.now() - snapshotMs) / 1000))
      : null;
    const updatedAt = toWibIso(snapshot.fetchedAt) || snapshot.fetchedAt;

    let oldest = null;
    for (const row of snapshot.rows || []) {
      const ageSec = row?.lastSyncAgoSec;
      if (!Number.isFinite(ageSec)) continue;
      if (!oldest || ageSec > oldest.ageSec) {
        oldest = {
          kodetoko: row?.storeCode != null ? Number.parseInt(String(row.storeCode), 10) : null,
          namaToko: row?.storeName || "",
          ageSec,
          lastSyncEpoch:
            row?.lastSyncEpoch != null ? Number.parseInt(String(row.lastSyncEpoch), 10) : null,
        };
      }
    }

    const data = {
      totalStores: allowedBranches
        ? snapshot.total
        : Number.isFinite(totalMaster)
          ? totalMaster
          : snapshot.total,
      synced: snapshot.synced,
      stale: snapshot.stale,
      problem: snapshot.problem,
      thresholdsSec: { syncedMax: SYNCED_MAX_SEC, staleMax: STALE_MAX_SEC },
      oldest: oldest || { kodetoko: null, namaToko: "", ageSec: null, lastSyncEpoch: null },
    };

    if (data.totalStores !== data.synced + data.stale + data.problem) {
      if (!allowedBranches) {
        console.warn("[syncController] KPI invariant violated", {
          totalStores: data.totalStores,
          synced: data.synced,
          stale: data.stale,
          problem: data.problem,
        });
      }
    }

    return ok(res, data, { updatedAt, snapshotAgeSec });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/sync/status
 * Returns summary of current sync health.
 */
async function getSyncStatus(req, res, next) {
  try {
    const mode = String(req.query.mode || "")
      .toLowerCase()
      .trim();
    const wantsUpstream = mode === "upstream";
    const excludeBazar = parseBooleanQuery(req.query.excludeBazar);
    const allowedBranches = getAllowedBranches(req.authz);

    let snapshot = null;
    if (isSyncTestMode()) {
      snapshot = await loadSyncSnapshot({ mergeBaseline: false });
    } else {
      snapshot = await loadCachedSyncSnapshotFromDb();
      if (!snapshot && LIVE_SYNC_FETCH_ENABLED) {
        snapshot = await loadSyncSnapshot({ mergeBaseline: !wantsUpstream });
      }
    }

    if (!snapshot) {
      return fail(
        res,
        503,
        "SYNC_SNAPSHOT_EMPTY",
        "No cached sync snapshot available yet. Wait for the scheduler poll."
      );
    }

    snapshot = applySnapshotFilters(snapshot, { excludeBazar });
    snapshot = applyScopeFilters(snapshot, allowedBranches);

    const serverNow = snapshot.asOf || new Date().toISOString();

    let oldestSync = null;
    let oldestStore = null;
    for (const row of snapshot.rows) {
      if (row.lastSyncAt) {
        if (!oldestSync || new Date(row.lastSyncAt) < new Date(oldestSync)) {
          oldestSync = row.lastSyncAt;
          oldestStore = { storeCode: row.storeCode, storeName: row.storeName };
        }
      }
    }

    return ok(res, {
      total: snapshot.total,
      synced: snapshot.synced,
      stale: snapshot.stale,
      missing: 0,
      missingToday: 0,
      orphaned: snapshot.orphaned,
      problem: snapshot.problem,
      late: snapshot.late || 0,
      noTimestamp: snapshot.noTimestamp || 0,
      staleWarningMs: STALE_WARNING_MS,
      problemThresholdMs: PROBLEM_THRESHOLD_MS,
      staleThresholdMs: PROBLEM_THRESHOLD_MS,
      branches: buildBranchStats(snapshot.rows, allowedBranches),
      oldestSync,
      oldestStore,
      fetchedAt: snapshot.fetchedAt,
      source: snapshot.source,
      serverNow,
      mode: wantsUpstream ? "upstream" : "baseline",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/sync/stores
 * Returns paginated list of stores with sync status.
 * Query params: branch, staleOnly, search, page, pageSize
 */
async function getSyncStoresLegacy(req, res, next) {
  try {
    const {
      branch,
      branchId,
      staleOnly,
      status,
      search,
      page = 1,
      pageSize = 50,
      limit,
      sort,
      mode,
      excludeBazar,
    } = req.query;
    const modeValue = mode ? String(mode).toLowerCase().trim() : "";
    const wantsUpstream = modeValue === "upstream";
    const excludeBazarEnabled = parseBooleanQuery(excludeBazar);
    const allowedBranches = getAllowedBranches(req.authz);

    let snapshot = null;
    if (isSyncTestMode()) {
      snapshot = await loadSyncSnapshot({ mergeBaseline: false });
    } else {
      snapshot = await loadCachedSyncSnapshotFromDb();
      if (!snapshot && LIVE_SYNC_FETCH_ENABLED) {
        snapshot = await loadSyncSnapshot({ mergeBaseline: !wantsUpstream });
      }
    }
    if (!snapshot) {
      return fail(
        res,
        503,
        "SYNC_SNAPSHOT_EMPTY",
        "No cached sync snapshot available yet. Wait for the scheduler poll."
      );
    }

    snapshot = applySnapshotFilters(snapshot, { excludeBazar: excludeBazarEnabled });
    snapshot = applyScopeFilters(snapshot, allowedBranches);
    let filtered = snapshot.rows;

    const branchFilter = branchId || branch;
    if (branchFilter) {
      filtered = filtered.filter((r) => r.branchId === String(branchFilter));
    }

    const statusValue = status ? String(status).toLowerCase().trim() : "";
    if (statusValue) {
      if (
        statusValue === "synced" ||
        statusValue === "ok" ||
        statusValue === "on_time" ||
        statusValue === "ontime"
      ) {
        filtered = filtered.filter((r) => r.status === "synced");
      } else if (statusValue === "stale" || statusValue === "warning") {
        filtered = filtered.filter((r) => r.status === "stale");
      } else if (statusValue === "problem" || statusValue === "late") {
        filtered = filtered.filter((r) => r.status === "problem");
      }
    } else {
      const staleOnlyEnabled = staleOnly === true || staleOnly === "true" || staleOnly === "1";
      if (staleOnlyEnabled) {
        filtered = filtered.filter((r) => r.status === "stale");
      }
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.storeCode && r.storeCode.toLowerCase().includes(q)) ||
          (r.storeName && r.storeName.toLowerCase().includes(q))
      );
    }

    const sortValue = sort ? String(sort).toLowerCase().trim() : "default";
    if (sortValue === "agedesc") {
      filtered.sort((a, b) => (b.lastSyncAgoSec || 0) - (a.lastSyncAgoSec || 0));
    } else if (sortValue === "ageasc") {
      filtered.sort((a, b) => (a.lastSyncAgoSec || 0) - (b.lastSyncAgoSec || 0));
    } else {
      filtered.sort((a, b) => {
        const aProblem = a.status === "problem";
        const bProblem = b.status === "problem";
        if (aProblem !== bProblem) return aProblem ? -1 : 1;
        const aStale = a.status === "stale";
        const bStale = b.status === "stale";
        if (aStale !== bStale) return aStale ? -1 : 1;
        const aTime = a.lastSyncAt ? new Date(a.lastSyncAt).getTime() : 0;
        const bTime = b.lastSyncAt ? new Date(b.lastSyncAt).getTime() : 0;
        return aTime - bTime;
      });
    }

    const sizeOverride = limit != null ? Number.parseInt(String(limit), 10) : null;
    const pageNum = sizeOverride ? 1 : Math.max(1, Number.parseInt(String(page), 10) || 1);
    const size = Math.min(
      100,
      Math.max(1, sizeOverride || Number.parseInt(String(pageSize), 10) || 50)
    );
    const start = (pageNum - 1) * size;
    const paginated = filtered.slice(start, start + size);

    return ok(res, paginated, {
      pagination: {
        page: pageNum,
        pageSize: size,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / size),
      },
      fetchedAt: snapshot.fetchedAt,
      source: snapshot.source,
      mode: wantsUpstream ? "upstream" : "baseline",
    });
  } catch (err) {
    next(err);
  }
}

async function getSyncStores(req, res, next) {
  try {
    const { mode } = req.query;

    if (isSyncTestMode()) {
      return getSyncStoresLegacy(req, res, next);
    }

    const wantsUpstream = mode ? String(mode).toLowerCase().trim() === "upstream" : false;
    if (wantsUpstream) {
      return getSyncStoresLegacy(req, res, next);
    }

    return getSyncStoresOptimized(req, res, next);
  } catch (err) {
    next(err);
  }
}

async function getSyncStoresOptimized(req, res, next) {
  try {
    const {
      branch,
      branchId,
      staleOnly,
      status,
      search,
      page = 1,
      pageSize = 50,
      limit,
      sort,
      excludeBazar,
    } = req.query;

    const excludeBazarEnabled = parseBooleanQuery(excludeBazar);
    const allowedBranches = getAllowedBranches(req.authz);

    const [metaRows] = await db.sequelize.query(
      `SELECT MAX(updated_at) AS updated_at FROM store_sync_snapshot;`
    );
    const fetchedAtRaw = metaRows?.[0]?.updated_at;
    if (!fetchedAtRaw) {
      return getSyncStoresLegacy(req, res, next);
    }
    const fetchedAt = new Date(fetchedAtRaw).toISOString();

    const replacements = {};
    const whereClauses = [];

    whereClauses.push(
      `(last_sync_epoch IS NOT NULL AND (EXTRACT(EPOCH FROM NOW()) - last_sync_epoch) <= 604800)`
    );

    if (excludeBazarEnabled) {
      whereClauses.push(
        `(nama_toko IS NULL OR (nama_toko NOT ILIKE '%bazar%' AND nama_toko NOT ILIKE '%bazaar%'))`
      );
    }

    if (allowedBranches !== null) {
      if (allowedBranches.length === 0) {
        return ok(res, [], {
          pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
          fetchedAt,
          source: { ok: true, cached: true },
          mode: "baseline",
        });
      }
      whereClauses.push(`branch_id IN (:allowedBranches)`);
      replacements.allowedBranches = allowedBranches;
    }

    const branchFilter = branchId || branch;
    if (branchFilter) {
      whereClauses.push(`branch_id = :branchFilter`);
      replacements.branchFilter = String(branchFilter);
    }

    const statusExpr = `
      CASE
        WHEN last_sync_epoch IS NULL THEN 'problem'
        WHEN (EXTRACT(EPOCH FROM NOW()) - last_sync_epoch) <= ${SYNCED_MAX_SEC} THEN 'synced'
        WHEN (EXTRACT(EPOCH FROM NOW()) - last_sync_epoch) <= ${STALE_MAX_SEC} THEN 'stale'
        ELSE 'problem'
      END
    `;

    const nowEpochSql = "EXTRACT(EPOCH FROM NOW())";
    const statusValue = status ? String(status).toLowerCase().trim() : "";
    if (statusValue) {
      if (
        statusValue === "synced" ||
        statusValue === "ok" ||
        statusValue === "on_time" ||
        statusValue === "ontime"
      ) {
        whereClauses.push(`last_sync_epoch >= (${nowEpochSql} - ${SYNCED_MAX_SEC})`);
      } else if (statusValue === "stale" || statusValue === "warning") {
        whereClauses.push(
          `last_sync_epoch >= (${nowEpochSql} - ${STALE_MAX_SEC}) AND last_sync_epoch < (${nowEpochSql} - ${SYNCED_MAX_SEC})`
        );
      } else if (statusValue === "problem" || statusValue === "late") {
        whereClauses.push(
          `(last_sync_epoch < (${nowEpochSql} - ${STALE_MAX_SEC}) OR last_sync_epoch IS NULL)`
        );
      }
    } else {
      const staleOnlyEnabled = staleOnly === true || staleOnly === "true" || staleOnly === "1";
      if (staleOnlyEnabled) {
        whereClauses.push(
          `last_sync_epoch >= (${nowEpochSql} - ${STALE_MAX_SEC}) AND last_sync_epoch < (${nowEpochSql} - ${SYNCED_MAX_SEC})`
        );
      }
    }

    if (search) {
      const s = String(search).toLowerCase().trim();
      whereClauses.push(`(CAST(kodetoko AS TEXT) ILIKE :search OR nama_toko ILIKE :search)`);
      replacements.search = `%${s}%`;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [countRows] = await db.sequelize.query(
      `SELECT COUNT(*)::int as total FROM store_sync_snapshot ${whereSql}`,
      { replacements }
    );
    const filteredTotal = countRows[0]?.total || 0;

    const sortValue = sort ? String(sort).toLowerCase().trim() : "default";
    let orderSql = "";
    if (sortValue === "agedesc") {
      orderSql = "ORDER BY last_sync_epoch ASC NULLS LAST";
    } else if (sortValue === "ageasc") {
      orderSql = "ORDER BY last_sync_epoch DESC NULLS LAST";
    } else {
      orderSql = `ORDER BY last_sync_epoch ASC NULLS FIRST`;
    }

    const sizeOverride = limit != null ? Number.parseInt(String(limit), 10) : null;
    const pageNum = sizeOverride ? 1 : Math.max(1, Number.parseInt(String(page), 10) || 1);
    const size = Math.min(
      100,
      Math.max(1, sizeOverride || Number.parseInt(String(pageSize), 10) || 50)
    );
    const offset = (pageNum - 1) * size;

    replacements.limit = size;
    replacements.offset = offset;

    const query = `
      SELECT
        branch_id, kodetoko, nama_toko, last_sync_epoch, updated_at,
        (${statusExpr}) as status,
        GREATEST(0, EXTRACT(EPOCH FROM NOW()) - last_sync_epoch)::int as age_sec
      FROM store_sync_snapshot
      ${whereSql}
      ${orderSql}
      LIMIT :limit OFFSET :offset
    `;

    const [rows] = await db.sequelize.query(query, { replacements });

    const enriched = rows.map((r) => {
      const branchName = getBranchNameById(r.branch_id) || r.branch_id;
      const ageSec = r.age_sec;
      const status = r.status;
      const reason =
        ageSec == null
          ? "problem"
          : ageSec > STALE_MAX_SEC
            ? "late"
            : ageSec > SYNCED_MAX_SEC
              ? "stale"
              : "ok";

      let problemReason = reason;
      if (status === "problem" && r.last_sync_epoch == null) {
        problemReason = "no_timestamp";
      }

      return {
        storeCode: r.kodetoko,
        storeName: r.nama_toko,
        branchId: r.branch_id,
        branchName,
        lastSyncAt: r.last_sync_epoch ? new Date(r.last_sync_epoch * 1000).toISOString() : null,
        lastSyncAgoSec: ageSec,
        status,
        problemReason,
        isStale: status === "stale",
        isProblem: status === "problem",
        isSynced: status === "synced",
        sourceError: false,
      };
    });

    return ok(res, enriched, {
      pagination: {
        page: pageNum,
        pageSize: size,
        total: filteredTotal,
        totalPages: Math.ceil(filteredTotal / size),
      },
      fetchedAt,
      source: {
        ok: true,
        errorCount: 0,
        maxErrors: SOURCE_MAX_ERRORS,
        totalBranches: BRANCHES.length,
        errors: [],
        cached: true,
      },
      mode: "baseline",
    });
  } catch (err) {
    if (isOptimizedSnapshotSchemaError(err)) {
      console.warn(
        "[syncController] Optimized store snapshot query unavailable; falling back to legacy snapshot path:",
        err?.message || err
      );
      return getSyncStoresLegacy(req, res, next);
    }
    next(err);
  }
}

/**
 * GET /api/sync/stores/:kodetoko
 */
async function getSyncStoreDetail(req, res, next) {
  try {
    const kodetokoRaw = req.params?.kodetoko;
    const kodetoko = kodetokoRaw != null ? Number.parseInt(String(kodetokoRaw), 10) : NaN;
    if (!Number.isFinite(kodetoko)) {
      return fail(res, 400, "BAD_REQUEST", "Invalid kodetoko");
    }

    let snapshot = null;
    if (isSyncTestMode()) {
      snapshot = await loadSyncSnapshot({ mergeBaseline: false });
    } else {
      snapshot = await loadCachedSyncSnapshotFromDb();
      if (!snapshot && LIVE_SYNC_FETCH_ENABLED) {
        snapshot = await loadSyncSnapshot({ mergeBaseline: true });
      }
    }
    if (!snapshot) {
      return fail(
        res,
        503,
        "SYNC_SNAPSHOT_EMPTY",
        "No cached sync snapshot available yet. Wait for the scheduler poll."
      );
    }

    const match = (snapshot.rows || []).find((r) => String(r.storeCode) === String(kodetoko));
    if (!match) {
      return fail(res, 404, "NOT_FOUND", "Store not found in snapshot");
    }

    const scopeCheck = ensureBranchAccessForBranchId(req, match.branchId, { failClosed: true });
    if (!scopeCheck.ok) {
      return fail(res, scopeCheck.status, scopeCheck.code, scopeCheck.message, scopeCheck.details);
    }

    return ok(res, {
      storeCode: match.storeCode,
      storeName: match.storeName,
      branchId: match.branchId,
      branchName: match.branchName,
      status: match.status,
      lastSyncAt: match.lastSyncAt,
      ageSec: match.lastSyncAgoSec,
      updatedAt: snapshot.fetchedAt,
      updatedAtWib: toWibIso(snapshot.fetchedAt) || snapshot.fetchedAt,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/sync/history/:storeCode
 * Returns historical sync records for a store (last 30 minutes from DB).
 */
async function getSyncHistory(req, res, next) {
  try {
    const { storeCode } = req.params;
    const scopeCheck = await ensureStoreBranchAccess(req, storeCode, { failClosed: true });
    if (!scopeCheck.ok) {
      return fail(res, scopeCheck.status, scopeCheck.code, scopeCheck.message, scopeCheck.details);
    }

    const { minutes = MAX_HISTORY_MINUTES } = req.query;
    const requestedMinutes = Number.parseInt(String(minutes), 10);
    const minAgo = Math.min(
      MAX_HISTORY_MINUTES,
      Math.max(1, Number.isFinite(requestedMinutes) ? requestedMinutes : MAX_HISTORY_MINUTES)
    );
    const since = new Date(Date.now() - minAgo * 60 * 1000);

    const records = await db.SyncLog.findAll({
      where: {
        store_code: String(storeCode),
        polled_at: { [Op.gte]: since },
      },
      order: [["polled_at", "DESC"]],
      limit: 100,
    });

    for (const record of records || []) {
      const rowScope = ensureBranchAccessForBranchId(req, record.branch_id, { failClosed: true });
      if (!rowScope.ok) {
        return fail(res, rowScope.status, rowScope.code, rowScope.message, rowScope.details);
      }
    }

    return ok(res, {
      storeCode,
      minutes: minAgo,
      records: records.map((r) => ({
        id: r.id,
        storeCode: r.store_code,
        storeName: r.store_name,
        branchId: r.branch_id,
        branchName: r.branch_name,
        lastSyncAt: r.last_sync_at,
        isStale: r.is_stale,
        isProblem: r.is_problem,
        isMissingToday: r.is_missing_today,
        polledAt: r.polled_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/sync/history/:storeCode/summary
 * Returns bucketed sync history for a store for a given day.
 */
async function getSyncHistorySummary(req, res, next) {
  try {
    if (!db.SyncSummary) {
      return fail(res, 503, "SUMMARY_UNAVAILABLE", "Sync summary table is unavailable", {
        requestId: req.id || null,
      });
    }

    const { storeCode } = req.params;
    const scopeCheck = await ensureStoreBranchAccess(req, storeCode, { failClosed: true });
    if (!scopeCheck.ok) {
      return fail(res, scopeCheck.status, scopeCheck.code, scopeCheck.message, scopeCheck.details);
    }

    const dateStr = req.query.date || toWibDate();
    const bucketMinutes = Number.parseInt(
      String(req.query.bucketMinutes || SUMMARY_BUCKET_MINUTES),
      10
    );

    if (!ALLOWED_SUMMARY_BUCKETS.has(bucketMinutes)) {
      return fail(res, 400, "VALIDATION_ERROR", "bucketMinutes must be 10, 30, or 60", {
        requestId: req.id || null,
      });
    }

    const range = getWibDayRange(dateStr);
    if (!range) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid date format (YYYY-MM-DD)", {
        requestId: req.id || null,
      });
    }

    const baseRows = await db.SyncSummary.findAll({
      where: {
        store_code: String(storeCode),
        bucket_minutes: SUMMARY_BUCKET_MINUTES,
        bucket_start: { [Op.gte]: range.start, [Op.lt]: range.end },
      },
      order: [["bucket_start", "ASC"]],
    });

    const mapped = baseRows.map(mapSummaryRow);
    const buckets = aggregateSummaryBuckets(mapped, range.start, bucketMinutes);
    const problemBuckets = buckets.filter((b) => b.isProblem).length;
    const staleBuckets = buckets.filter((b) => !b.isProblem && b.isStale).length;

    return ok(res, {
      storeCode,
      date: dateStr,
      bucketMinutes,
      summary: {
        totalBuckets: buckets.length,
        staleBuckets,
        problemBuckets,
        syncedBuckets: buckets.length - staleBuckets - problemBuckets,
      },
      buckets,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/sync/refresh
 * Force refresh sync data from the internal data API.
 */
async function refreshSync(req, res, next) {
  try {
    invalidateSyncCache();

    const run = await pollAndPersistSync();
    const snapshot = await loadCachedSyncSnapshotFromDb();
    if (!snapshot) {
      return fail(
        res,
        503,
        "SYNC_SNAPSHOT_EMPTY",
        "Refresh ran, but no cached snapshot is available yet."
      );
    }

    return ok(res, {
      message: "Sync data refreshed",
      total: snapshot.total,
      synced: snapshot.synced,
      stale: snapshot.stale,
      problem: snapshot.problem,
      missing: snapshot.missing,
      missingToday: snapshot.missing,
      late: snapshot.late,
      noTimestamp: snapshot.noTimestamp,
      orphaned: snapshot.orphaned,
      fetchedAt: snapshot.fetchedAt,
      source: snapshot.source,
      mode: "baseline",
      job: run,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Poll sync data and persist to DB.
 * Delegated to the service layer.
 */
async function pollAndPersistSync() {
  return syncSnapshotService.pollAndPersistSync();
}

/**
 * GET /api/sync/live
 * Public (no auth) endpoint for the TV live dashboard.
 * Returns KPI summary, branch health, and top late stores in one payload.
 */
async function getLiveSyncDashboard(req, res, next) {
  try {
    let snapshot = null;
    if (isSyncTestMode()) {
      snapshot = await loadSyncSnapshot({ mergeBaseline: false });
    } else {
      snapshot = await loadCachedSyncSnapshotFromDb();
      if (!snapshot && LIVE_SYNC_FETCH_ENABLED) {
        snapshot = await loadSyncSnapshot({ mergeBaseline: true });
      }
    }

    if (!snapshot) {
      return fail(
        res,
        503,
        "SYNC_SNAPSHOT_EMPTY",
        "No cached sync snapshot available yet. Wait for the scheduler poll."
      );
    }

    snapshot = applySnapshotFilters(snapshot, { excludeBazar: true });

    const serverNow = snapshot.asOf || new Date().toISOString();

    const branches = buildBranchStats(snapshot.rows, null);

    let oldest = null;
    for (const row of snapshot.rows) {
      const ageSec = row?.lastSyncAgoSec;
      if (!Number.isFinite(ageSec)) continue;
      if (!oldest || ageSec > oldest.ageSec) {
        oldest = {
          storeCode: row.storeCode,
          storeName: row.storeName || "",
          ageSec,
        };
      }
    }

    const lateStores = snapshot.rows
      .filter((r) => r.status === "problem")
      .sort((a, b) => (b.lastSyncAgoSec || 0) - (a.lastSyncAgoSec || 0))
      .slice(0, 20)
      .map((r) => ({
        storeCode: r.storeCode,
        storeName: r.storeName || "",
        branchName: r.branchName || "",
        lastSyncAgoSec: r.lastSyncAgoSec,
        lastSyncAt: r.lastSyncAt || null,
        problemReason: r.problemReason || null,
      }));

    return ok(res, {
      kpi: {
        total: snapshot.total,
        synced: snapshot.synced,
        stale: snapshot.stale,
        problem: snapshot.problem,
        late: snapshot.late || 0,
        noTimestamp: snapshot.noTimestamp || 0,
      },
      thresholds: {
        syncedMaxSec: SYNCED_MAX_SEC,
        staleMaxSec: STALE_MAX_SEC,
      },
      branches,
      oldest: oldest || { storeCode: null, storeName: "", ageSec: null },
      lateStores,
      fetchedAt: snapshot.fetchedAt,
      serverNow,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSyncStatus,
  getSyncSummary,
  getSyncStores,
  getSyncStoreDetail,
  getSyncHistory,
  getSyncHistorySummary,
  refreshSync,
  pollAndPersistSync,
  getLiveSyncDashboard,
};
