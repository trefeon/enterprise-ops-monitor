const { ok, fail } = require("../utils/response");
const { toWibDate, toWibIso } = require("../utils/time");
const dataDb = require("../services/dataDb");
const { getBranchNameById } = require("../services/dataSource");
const { buildExternalMeta } = require("../services/dataGateway/meta");
const { fetchHistorySummaryByBranch } = require("../services/eodHistory");

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

function summarizeByBranch(rows) {
  const stats = new Map();
  for (const row of rows) {
    const areaId = row.branchId || "UNKNOWN";
    const areaName = row.branchName || getBranchNameById(areaId) || areaId;
    if (!stats.has(areaId)) {
      stats.set(areaId, { areaId, areaName, storesTotal: 0, done: 0, pending: 0, failed: 0 });
    }
    const s = stats.get(areaId);
    s.storesTotal += 1;
    if (row.status === "done") s.done += 1;
    else if (row.status === "failed") s.failed += 1;
    else s.pending += 1;
  }

  return Array.from(stats.values()).map((row) => ({
    ...row,
    completionRate: row.storesTotal > 0 ? row.done / row.storesTotal : 0,
  }));
}

function severityFromCount(count, thresholds) {
  if (count >= thresholds.high) return "HIGH";
  if (count >= thresholds.medium) return "MEDIUM";
  return "LOW";
}

exports.getEodAlerts = async (req, res) => {
  try {
    const today = toWibDate();
    const yesterday = toWibDate(new Date(Date.now() - 24 * 60 * 60 * 1000));

    const eodRowsRaw = await dataDb.fetchEodCurrent();
    const eodRows = Array.isArray(eodRowsRaw) ? eodRowsRaw : [];
    const todaySummary = summarizeByBranch(eodRows);

    const yesterdaySummary = await fetchHistorySummaryByBranch(yesterday);
    const yesterdayIndex = new Map(
      Array.isArray(yesterdaySummary)
        ? yesterdaySummary.map((row) => [String(row.areaId), row])
        : []
    );

    const alerts = [];

    const topFailed = [...todaySummary]
      .filter((row) => row.failed > 0)
      .sort((a, b) => b.failed - a.failed)
      .slice(0, 3);

    for (const row of topFailed) {
      alerts.push({
        id: `eod_failed_${row.areaId}_${today}`,
        type: "EOD_FAILED_BRANCH",
        severity: severityFromCount(row.failed, { high: 20, medium: 5 }),
        title: `${row.areaName} has ${row.failed} failed stores`,
        meta: {
          areaId: row.areaId,
          failed: row.failed,
          total: row.storesTotal,
          completionRate: row.completionRate,
        },
        createdAt: toWibIso(new Date()),
      });
    }

    if (Array.isArray(yesterdaySummary)) {
      for (const row of todaySummary) {
        const yesterdayRow = yesterdayIndex.get(String(row.areaId));
        if (!yesterdayRow) continue;
        const diff = row.failed - (yesterdayRow.failed || 0);
        if (diff <= 0) continue;

        alerts.push({
          id: `eod_regression_${row.areaId}_${today}`,
          type: "EOD_REGRESSION",
          severity: severityFromCount(diff, { high: 10, medium: 3 }),
          title: `${row.areaName} regression: +${diff} failed vs yesterday`,
          meta: {
            areaId: row.areaId,
            todayFailed: row.failed,
            yesterdayFailed: yesterdayRow.failed || 0,
            delta: diff,
          },
          createdAt: toWibIso(new Date()),
        });
      }
    }

    return ok(res, alerts, {
      date: today,
      timezone: "Asia/Jakarta",
      ...buildExternalMeta({
        source: "db",
        sourceFetchedAt: maxIsoDate(eodRows.map((r) => r.sourceSyncedAt)),
        partial: eodRowsRaw === null,
        warnings:
          eodRowsRaw === null
            ? [{ code: "EOD_DB_UNAVAILABLE", message: "EOD snapshot not available in DB." }]
            : [],
      }),
      source: {
        today: "db",
        yesterday: Array.isArray(yesterdaySummary) ? "history" : "unavailable",
      },
    });
  } catch (error) {
    console.error("EOD Alerts Error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Internal Server Error");
  }
};
