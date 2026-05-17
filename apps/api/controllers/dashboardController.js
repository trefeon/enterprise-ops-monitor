const { SystemLog, BackupLog, SyncAlertState } = require("../models");
const { Op } = require("sequelize");
const { ok, fail } = require("../utils/response");
const { toWibDate, toWibIso } = require("../utils/time");
const { syncDataToDb } = require("../services/dataSyncService");
const { getBackupDir, listBackupFiles } = require("../utils/backupStorage");
const dataDb = require("../services/dataDb");
const { buildExternalMeta } = require("../services/dataGateway/meta");
const { getAllowedBranches } = require("../services/authzService");

function maxIsoDate(values) {
  let best = null;
  let bestMs = -Infinity;
  for (const v of values || []) {
    if (!v) continue;
    const d = new Date(v);
    const ms = d.getTime();
    if (Number.isFinite(ms) && ms > bestMs) {
      bestMs = ms;
      best = d.toISOString();
    }
  }
  return best;
}

function mapToUpcomingSession(rows) {
  const today = toWibDate();
  if (!today) return rows;

  return (rows || []).map((row) => {
    const activityDate = toWibDate(row?.maxUploadAt || row?.eodAt || row?.uploadAt || null);
    const shouldReset = !activityDate || activityDate < today;
    if (!shouldReset) return row;

    return {
      ...row,
      statusSales: null,
      uploadPercent: 0,
      eodAt: null,
      uploadAt: null,
      maxUploadAt: null,
      status: "pending",
    };
  });
}

async function buildDashboardSummary({ allowedBranches = null } = {}) {
  const today = toWibDate();

  const parseCandidateDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  // 1. EOD + Employees (DB snapshots)
  const [eodRowsRaw, employeeRowsRaw] = await Promise.all([
    dataDb.fetchEodCurrent({ targetBusinessDate: today }),
    dataDb.fetchEmployeesAll(),
  ]);

  let eodRows = Array.isArray(eodRowsRaw) ? mapToUpcomingSession(eodRowsRaw) : [];
  let employeeRows = Array.isArray(employeeRowsRaw) ? employeeRowsRaw : [];

  // FILTER BY BRANCH SCOPE
  if (allowedBranches !== null) {
    eodRows = eodRows.filter((r) => {
      const bId = r.branchId || r.branch_id;
      return allowedBranches.includes(String(bId));
    });
    employeeRows = employeeRows.filter((r) => {
      const bId = r.branchId || r.branch_id;
      return allowedBranches.includes(String(bId));
    });
  }

  const effectiveDate = today;

  const storeCodeSet = new Set();
  let completed = 0;
  let failed = 0;
  let lastSyncAt = null;

  for (const row of eodRows) {
    if (row.storeCode) storeCodeSet.add(String(row.storeCode));
    if (row.status === "done") completed += 1;
    else if (row.status === "failed") failed += 1;

    const candidate =
      parseCandidateDate(row.sourceSyncedAt) ||
      parseCandidateDate(row.recordedAt) ||
      parseCandidateDate(row.uploadAt) ||
      parseCandidateDate(row.eodAt);
    if (candidate && (!lastSyncAt || candidate > lastSyncAt)) {
      lastSyncAt = candidate;
    }
  }

  // Stores total should represent the full fleet, not just today's EOD rows.
  // Prefer persisted master data (data_stores), then fall back to what we can infer.
  let totalStores = 0;

  // Inference fallback (if not pulling from master)
  const inferred = new Set();
  for (const row of employeeRows) {
    if (row.storeCode) inferred.add(String(row.storeCode));
  }
  for (const row of eodRows) {
    if (row.storeCode) inferred.add(String(row.storeCode));
  }
  totalStores = inferred.size;

  // If user is unrestricted, we might trust db count, but to be safe with scope,
  // we rely on Inference from filtered rows OR query stores_master with scope.
  // For now, inference from filtered EOD/Employee rows is safest for consistency.

  if (allowedBranches === null) {
    // Unrestricted: Use DB count if available
    try {
      const dbCount = await dataDb.fetchStoresCount();
      if (Number.isFinite(dbCount) && dbCount > 0 && totalStores < dbCount) totalStores = dbCount;
    } catch (err) {
      console.error(`[dashboardController] fetchStoresCount failed:`, err);
    }
  }

  const pending = Math.max(0, totalStores - completed - failed);
  const employeeBranchSet = new Set();
  for (const row of employeeRows) {
    if (row.branchId != null) employeeBranchSet.add(String(row.branchId));
  }
  const employeesTotal = employeeRows.length;
  const employeesBranches = employeeBranchSet.size;
  const employeesSyncedAt = maxIsoDate(employeeRows.map((r) => r.lastSyncedAt))
    ? toWibIso(maxIsoDate(employeeRows.map((r) => r.lastSyncedAt)))
    : null;

  // 2. System Health (last 24h)
  const criticalErrors = await SystemLog.count({
    where: {
      level: "CRITICAL",
      createdAt: {
        [Op.gte]: new Date(new Date() - 24 * 60 * 60 * 1000),
      },
    },
  });

  let systemHealth = "OK";
  if (criticalErrors > 0) systemHealth = "CRITICAL";
  else {
    const errorErrors = await SystemLog.count({
      where: {
        level: "ERROR",
        createdAt: {
          [Op.gte]: new Date(new Date() - 24 * 60 * 60 * 1000),
        },
      },
    });
    if (errorErrors > 0) systemHealth = "WARNING";
  }

  // 3. Backups (from disk, not logs)
  const backupDir = getBackupDir();
  const backupFiles = listBackupFiles(backupDir);
  const latestBackupAt = backupFiles[0]?.modifiedAt || null;

  const interactionsToday = await SystemLog.count({
    where: {
      createdAt: {
        [Op.gte]: new Date(`${today}T00:00:00.000+07:00`),
      },
    },
  });

  return {
    storesTotal: totalStores,
    eod: {
      date: effectiveDate,
      done: completed,
      pending,
      failed,
      lastSyncAt: lastSyncAt ? toWibIso(lastSyncAt) : null,
    },
    interactionsToday,
    backups: {
      available: backupFiles.length,
      latestAt: latestBackupAt,
    },
    employees: {
      total: employeesTotal,
      branches: employeesBranches,
      syncedAt: employeesSyncedAt,
    },
    systemHealth,
    _sourceData: {
      eodRowsRaw,
      employeeRowsRaw,
    },
  };
}

exports.getDashboardSummary = async (req, res) => {
  try {
    const allowedBranches = getAllowedBranches(req.authz);
    const { _sourceData, ...summary } = await buildDashboardSummary({
      bypassCache: false,
      allowedBranches,
    });

    const eodRowsRaw = _sourceData?.eodRowsRaw || null;
    const employeeRowsRaw = _sourceData?.employeeRowsRaw || null;

    const eodRows = Array.isArray(eodRowsRaw) ? eodRowsRaw : [];
    const employeeRows = Array.isArray(employeeRowsRaw) ? employeeRowsRaw : [];

    const sourceFetchedAt = maxIsoDate([
      maxIsoDate(eodRows.map((r) => r.sourceSyncedAt)),
      maxIsoDate(employeeRows.map((r) => r.lastSyncedAt)),
    ]);

    const warnings = [];
    const partial = eodRowsRaw === null || employeeRowsRaw === null;
    if (eodRowsRaw === null)
      warnings.push({ code: "EOD_DB_UNAVAILABLE", message: "EOD snapshot not available in DB." });
    if (employeeRowsRaw === null)
      warnings.push({
        code: "EMPLOYEES_DB_UNAVAILABLE",
        message: "Employees snapshot not available in DB.",
      });

    const meta = {
      ...buildExternalMeta({ source: "db", sourceFetchedAt, partial, warnings }),
      timezone: "Asia/Jakarta",
    };

    return ok(res, summary, meta);
  } catch (err) {
    console.error("[dashboardController] getDashboardSummary error:", err);
    return fail(res, 500, "INTERNAL_ERROR", "Internal Server Error");
  }
};

exports.syncDashboard = async (req, res) => {
  try {
    const allowedBranches = getAllowedBranches(req.authz);
    const sync = await syncDataToDb({ includeEmployees: true, reason: "manual_dashboard_sync" });
    const { _sourceData, ...summary } = await buildDashboardSummary({
      bypassCache: false,
      allowedBranches,
    });
    return ok(res, summary, {
      refreshedAt: toWibIso(new Date()),
      sync,
    });
  } catch (err) {
    console.error("[dashboardController] syncDashboard error:", err);
    return fail(res, 500, "INTERNAL_ERROR", "Internal Server Error");
  }
};

exports.getDashboardAlerts = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "10", 10) || 10, 50);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const allowedBranches = getAllowedBranches(req.authz);
    const includeGlobalSignals = allowedBranches === null;

    const [
      recentLogs,
      lastBackup,
      eodRowsRaw,
      syncProblemCount,
      syncWarningCount,
      syncMissingTodayCount,
    ] = await Promise.all([
      includeGlobalSignals
        ? SystemLog.findAll({
            where: {
              level: { [Op.in]: ["CRITICAL", "ERROR", "WARNING"] },
              createdAt: { [Op.gte]: since },
            },
            order: [["createdAt", "DESC"]],
            limit,
          })
        : Promise.resolve([]),
      includeGlobalSignals
        ? BackupLog.findOne({ order: [["created_at", "DESC"]] })
        : Promise.resolve(null),
      dataDb.fetchEodCurrent(),
      includeGlobalSignals && SyncAlertState
        ? SyncAlertState.count({ where: { is_problem: true } })
        : Promise.resolve(0),
      includeGlobalSignals && SyncAlertState
        ? SyncAlertState.count({ where: { is_stale: true, is_problem: false } })
        : Promise.resolve(0),
      includeGlobalSignals && SyncAlertState
        ? SyncAlertState.count({ where: { is_missing_today: true } })
        : Promise.resolve(0),
    ]);

    let eodRows = Array.isArray(eodRowsRaw) ? mapToUpcomingSession(eodRowsRaw) : [];

    // STRICT SCOPE ENFORCEMENT FOR ALERTS
    if (allowedBranches !== null) {
      eodRows = eodRows.filter((r) => {
        const bId = r.branchId || r.branch_id;
        return allowedBranches.includes(String(bId));
      });
    }

    const failedEodCount = eodRows.filter((row) => row.status === "failed").length;

    const alerts = [];
    if (failedEodCount > 0) {
      alerts.push({
        id: `eod_failed_${Date.now()}`,
        type: "EOD_FAILED",
        severity: failedEodCount > 25 ? "HIGH" : "MEDIUM",
        title: `${failedEodCount} stores failed EOD`,
        createdAt: toWibIso(new Date()),
      });
    }

    if (includeGlobalSignals && lastBackup && lastBackup.status === "FAILED") {
      alerts.push({
        id: `backup_failed_${lastBackup.id}`,
        type: "BACKUP_FAILED",
        severity: "HIGH",
        title: `Backup failed: ${lastBackup.filename}`,
        createdAt: toWibIso(lastBackup.created_at || lastBackup.createdAt || new Date()),
      });
    }

    if (includeGlobalSignals && ((syncProblemCount || 0) > 0 || (syncWarningCount || 0) > 0)) {
      const parts = [];
      if ((syncProblemCount || 0) > 0) parts.push(`${syncProblemCount} late`);
      if ((syncWarningCount || 0) > 0) parts.push(`${syncWarningCount} warning`);
      if ((syncMissingTodayCount || 0) > 0) parts.push(`${syncMissingTodayCount} missing today`);
      alerts.push({
        id: `sync_health_${Date.now()}`,
        type: "SYNC_HEALTH",
        severity: (syncMissingTodayCount || 0) > 0 ? "MEDIUM" : "LOW",
        title: `SYNC: ${parts.join(" • ")}`,
        createdAt: toWibIso(new Date()),
      });
    }

    for (const l of recentLogs) {
      if (String(l.component || "").toUpperCase() === "SYNC") continue;
      alerts.push({
        id: `sys_${l.id}`,
        type: "SYSTEM_EVENT",
        severity: l.level === "CRITICAL" ? "HIGH" : l.level === "ERROR" ? "MEDIUM" : "LOW",
        title: `${l.component}: ${l.message}`,
        createdAt: toWibIso(l.createdAt),
      });
      if (alerts.length >= limit) break;
    }

    const sourceFetchedAt = maxIsoDate(eodRows.map((r) => r.sourceSyncedAt));
    const warnings = [];
    const partial = eodRowsRaw === null;
    if (eodRowsRaw === null)
      warnings.push({ code: "EOD_DB_UNAVAILABLE", message: "EOD snapshot not available in DB." });

    return ok(res, alerts.slice(0, limit), {
      ...buildExternalMeta({ source: "db", sourceFetchedAt, partial, warnings }),
      timezone: "Asia/Jakarta",
    });
  } catch (err) {
    console.error("[dashboardController] getDashboardAlerts error:", err);
    return fail(res, 500, "INTERNAL_ERROR", "Internal Server Error");
  }
};
