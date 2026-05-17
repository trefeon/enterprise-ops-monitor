const { Store, EODLog, Sequelize, SystemLog } = require("../models");
const { Op } = Sequelize;
const { ok, fail } = require("../utils/response");
const { getPagination, buildPaginationMeta } = require("../utils/pagination");
const { toWibDate, toWibIso } = require("../utils/time");
const ExcelJS = require("exceljs");
const dataDb = require("../services/dataDb");
const { getBranchNameById } = require("../services/dataSource");
const { buildExternalMeta } = require("../services/dataGateway/meta");
const { parsePercent, isComplete, fetchHistoryByStore } = require("../services/eodHistory");
const { getAllowedBranches } = require("../services/authzService");
const { ensureBranchAccessForBranchId, ensureStoreBranchAccess } = require("../middleware/rbac");

const EOD_EXPORT_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// ─── EOD Ranking Cache (for live TV dashboard) ───────────────────────────────
const EOD_RANKING_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let _eodRankingCache = null;
let _eodRankingCacheAt = 0;

function isBazarStore(name) {
  if (!name) return false;
  const t = String(name).toLowerCase();
  return t.includes("bazar") || t.includes("bazaar");
}

/**
 * GET /api/eod/live – Public (no auth) endpoint for TV dashboard.
 * Returns all-time EOD failure ranking: stores ranked by failure count.
 * Excludes bazar stores. Cached for 5 minutes.
 */
exports.getLiveEodRanking = async (req, res) => {
  try {
    const now = Date.now();

    // Serve from cache if fresh
    if (_eodRankingCache && now - _eodRankingCacheAt < EOD_RANKING_CACHE_TTL_MS) {
      return ok(res, _eodRankingCache.data, _eodRankingCache.meta);
    }

    const db = require("../models").sequelize;

    // Fast query: JOIN history with stores for name/branch, aggregate per store
    const [rows] = await db.query(`
      SELECT
        h.store_code,
        s.store_name,
        s.branch_id,
        COUNT(*) AS total_days,
        SUM(CASE WHEN h.status_sales = 'Not Ok' THEN 1 ELSE 0 END) AS failed_days,
        SUM(CASE WHEN h.status_sales = 'Ok' THEN 1 ELSE 0 END) AS ok_days,
        MIN(h.recorded_date) AS first_date,
        MAX(h.recorded_date) AS last_date
      FROM data_store_eod_history h
      JOIN data_stores s ON s.store_code = h.store_code
      GROUP BY h.store_code, s.store_name, s.branch_id
    `);

    // Filter and rank in JS (much faster for bazar exclusion)
    const ranked = rows
      .filter((r) => {
        // Exclude bazar stores
        if (isBazarStore(r.store_name)) return false;
        // Exclude stores with 0 total days (shouldn't happen but defensive)
        if (!r.total_days || Number(r.total_days) === 0) return false;
        // Only include stores that have at least 1 failure
        if (Number(r.failed_days) <= 0) return false;
        // Exclude "toko tutup" — stores with 100% fail rate (0 OK days = permanently closed)
        if (Number(r.ok_days) === 0) return false;
        return true;
      })
      .map((r) => {
        const totalDays = Number(r.total_days);
        const failedDays = Number(r.failed_days);
        const okDays = Number(r.ok_days);
        const failRate = totalDays > 0 ? failedDays / totalDays : 0;
        return {
          storeCode: String(r.store_code),
          storeName: r.store_name || "",
          branchId: r.branch_id != null ? String(r.branch_id) : null,
          branchName: r.branch_id
            ? getBranchNameById(String(r.branch_id)) || String(r.branch_id)
            : "UNKNOWN",
          totalDays,
          failedDays,
          okDays,
          failRate: Math.round(failRate * 10000) / 100, // percentage with 2 decimals
          firstDate: r.first_date,
          lastDate: r.last_date,
        };
      })
      .sort((a, b) => {
        // Primary sort: failed_days DESC, secondary: failRate DESC
        if (b.failedDays !== a.failedDays) return b.failedDays - a.failedDays;
        return b.failRate - a.failRate;
      })
      .slice(0, 30);

    // Global stats
    const totalStoresWithHistory = rows.filter((r) => !isBazarStore(r.store_name)).length;
    const totalStoresWithFailures = ranked.length;
    const totalFailureDays = ranked.reduce((sum, r) => sum + r.failedDays, 0);

    // Date range from data
    let minDate = null;
    let maxDate = null;
    for (const r of rows) {
      if (r.first_date && (!minDate || r.first_date < minDate)) minDate = r.first_date;
      if (r.last_date && (!maxDate || r.last_date > maxDate)) maxDate = r.last_date;
    }

    const cachePayload = {
      data: {
        ranking: ranked,
        summary: {
          totalStoresWithHistory,
          totalStoresWithFailures,
          totalFailureDays,
          dateRange: { from: minDate, to: maxDate },
        },
      },
      meta: {
        cachedAt: new Date().toISOString(),
        cacheTtlMs: EOD_RANKING_CACHE_TTL_MS,
        timezone: "Asia/Jakarta",
      },
    };

    _eodRankingCache = cachePayload;
    _eodRankingCacheAt = now;

    return ok(res, cachePayload.data, cachePayload.meta);
  } catch (error) {
    console.error("Live EOD Ranking Error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Failed to compute EOD ranking");
  }
};

function normalizeStatus(status) {
  if (!status) return null;
  const s = String(status).toLowerCase();
  if (["done", "pending", "failed"].includes(s)) return s;
  return null;
}

function mapEodRowToUi(row) {
  const branchId = row.branchId || "UNKNOWN";
  const branchName = row.branchName || getBranchNameById(branchId) || branchId;

  return {
    storeId: Number.isFinite(Number(row.storeCode)) ? Number(row.storeCode) : row.storeCode,
    storeCode: row.storeCode,
    storeName: row.storeName,
    areaId: branchId,
    areaName: branchName,
    status: row.status,
    lastEodAt: row.eodAt ? toWibIso(row.eodAt) : null,
    lastSyncAt: row.uploadAt ? toWibIso(row.uploadAt) : null,
    source: "db",
    errorMessage: row.status === "failed" ? "EOD not completed by deadline" : null,
  };
}

function maxDateValue(rows, field) {
  let best = null;
  let bestMs = -Infinity;
  for (const row of rows || []) {
    const v = row?.[field];
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
    const activityDate = toWibDate(
      row?.maxUploadAt || row?.eodAt || row?.uploadAt || row?.sourceSyncedAt || null
    );
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

async function fetchEodSnapshot({ date }) {
  const today = toWibDate();
  const targetDate = date || today;
  if (targetDate && targetDate < today) {
    const rows = await dataDb.fetchEodHistoryByRecordedDate(targetDate);
    return { rows, mode: "history", queryDate: targetDate };
  }

  const rows = await dataDb.fetchEodCurrent({ targetBusinessDate: targetDate });
  const normalizedRows = date ? rows : mapToUpcomingSession(rows);
  return { rows: normalizedRows, mode: "current", queryDate: targetDate };
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

function formatDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function formatExportDateTime(value) {
  const iso = toWibIso(value);
  return iso ? iso.replace("T", " ").replace("+07:00", " WIB") : "—";
}

function formatLabel(value, fallback = "All") {
  const raw = String(value ?? "").trim();
  return raw || fallback;
}

function formatStatusLabel(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "All";
  if (raw === "done") return "Done";
  if (raw === "pending") return "Pending";
  if (raw === "failed") return "Failed";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatReportDateLabel(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Today";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-");
    return `${day}/${month}/${year}`;
  }
  return raw;
}

function setThinBorder(cell) {
  cell.border = {
    top: { style: "thin", color: { argb: "D1D5DB" } },
    left: { style: "thin", color: { argb: "D1D5DB" } },
    bottom: { style: "thin", color: { argb: "D1D5DB" } },
    right: { style: "thin", color: { argb: "D1D5DB" } },
  };
}

function styleTitleCell(cell) {
  cell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1E293B" } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
}

function styleSubtitleCell(cell) {
  cell.font = { name: "Arial", size: 11, italic: true, color: { argb: "475569" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
}

function styleSummaryLabel(cell) {
  cell.font = { name: "Arial", bold: true, color: { argb: "334155" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
  cell.alignment = { vertical: "middle" };
  setThinBorder(cell);
}

function styleSummaryValue(cell) {
  cell.font = { name: "Arial", color: { argb: "0F172A" } };
  cell.alignment = { vertical: "middle", wrapText: true };
  setThinBorder(cell);
}

function styleTableHeader(cell) {
  cell.font = { name: "Arial", bold: true, color: { argb: "FFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "111827" } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  setThinBorder(cell);
}

function styleTableCell(cell, { center = false, wrap = false, alt = false } = {}) {
  cell.font = { name: "Arial", size: 10, color: { argb: "0F172A" } };
  cell.alignment = { vertical: "top", horizontal: center ? "center" : "left", wrapText: wrap };
  cell.fill = alt
    ? { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } }
    : { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF" } };
  setThinBorder(cell);
}

function buildEodWorkbook({
  reportDate,
  generatedAt,
  scopeLabel,
  statusLabel,
  searchLabel,
  scopeStoreCount,
  visibleStoreCount,
  doneCount,
  pendingCount,
  failedCount,
  completionRateText,
  branchRows,
  storeRows,
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Enterprise Ops Monitor";
  workbook.lastModifiedBy = "Enterprise Ops Monitor";
  workbook.created = new Date();
  workbook.modified = new Date();

  const summarySheet = workbook.addWorksheet("Summary", {
    properties: { defaultRowHeight: 20 },
    views: [{ state: "frozen", ySplit: 3 }],
  });
  summarySheet.columns = [{ width: 24 }, { width: 38 }, { width: 24 }, { width: 38 }];
  summarySheet.mergeCells("A1:D1");
  summarySheet.getCell("A1").value = "EOD Monitor Report";
  styleTitleCell(summarySheet.getCell("A1"));
  summarySheet.getRow(1).height = 26;

  summarySheet.mergeCells("A2:D2");
  summarySheet.getCell("A2").value =
    `Date: ${formatReportDateLabel(reportDate)} | Branch: ${scopeLabel} | Status: ${statusLabel} | Search: ${searchLabel}`;
  styleSubtitleCell(summarySheet.getCell("A2"));
  summarySheet.getRow(2).height = 24;

  summarySheet.mergeCells("A3:D3");
  summarySheet.getCell("A3").value = `Generated at ${generatedAt} | Export format: XLSX`;
  styleSubtitleCell(summarySheet.getCell("A3"));
  summarySheet.getRow(3).height = 22;

  const summaryPairs = [
    ["Report Date", formatReportDateLabel(reportDate), "Generated At", generatedAt],
    ["Branch Scope", scopeLabel, "Status Filter", statusLabel],
    ["Search Filter", searchLabel, "Scope Stores", Number(scopeStoreCount || 0)],
    ["Visible Rows", Number(visibleStoreCount || 0), "Completion Rate", completionRateText],
    ["Done", Number(doneCount || 0), "Pending", Number(pendingCount || 0)],
    ["Failed", Number(failedCount || 0), "Branches", Number(branchRows.length || 0)],
  ];

  summaryPairs.forEach((pair, idx) => {
    const rowNumber = idx + 4;
    summarySheet.getCell(`A${rowNumber}`).value = pair[0];
    summarySheet.getCell(`B${rowNumber}`).value = pair[1];
    summarySheet.getCell(`C${rowNumber}`).value = pair[2];
    summarySheet.getCell(`D${rowNumber}`).value = pair[3];
    styleSummaryLabel(summarySheet.getCell(`A${rowNumber}`));
    styleSummaryValue(summarySheet.getCell(`B${rowNumber}`));
    styleSummaryLabel(summarySheet.getCell(`C${rowNumber}`));
    styleSummaryValue(summarySheet.getCell(`D${rowNumber}`));
    summarySheet.getRow(rowNumber).height = 22;
  });

  const branchSheet = workbook.addWorksheet("Branch Health", {
    properties: { defaultRowHeight: 20 },
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  branchSheet.columns = [
    { width: 8 },
    { width: 28 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 16 },
  ];

  branchSheet.mergeCells("A1:G1");
  branchSheet.getCell("A1").value = "Branch Network Health";
  styleTitleCell(branchSheet.getCell("A1"));
  branchSheet.getRow(1).height = 26;

  branchSheet.mergeCells("A2:G2");
  branchSheet.getCell("A2").value =
    `Date: ${formatReportDateLabel(reportDate)} | Scope: ${scopeLabel} | Rows: ${scopeStoreCount}`;
  styleSubtitleCell(branchSheet.getCell("A2"));
  branchSheet.getRow(2).height = 22;

  branchSheet.mergeCells("A3:G3");
  branchSheet.getCell("A3").value =
    "Columns: Rank, Branch, Total Stores, Done, Pending, Failed, Completion Rate.";
  styleSubtitleCell(branchSheet.getCell("A3"));
  branchSheet.getRow(3).height = 24;

  const branchHeader = branchSheet.getRow(4);
  branchHeader.values = ["Rank", "Branch", "Total Stores", "Done", "Pending", "Failed", "Completion Rate"];
  branchHeader.height = 22;
  branchHeader.eachCell((cell) => styleTableHeader(cell));
  branchSheet.autoFilter = "A4:G4";

  if (branchRows.length === 0) {
    branchSheet.mergeCells("A5:G5");
    const emptyCell = branchSheet.getCell("A5");
    emptyCell.value = "No branch data for this filter.";
    emptyCell.alignment = { horizontal: "center", vertical: "middle" };
    emptyCell.font = { name: "Arial", italic: true, color: { argb: "64748B" } };
    emptyCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
    setThinBorder(emptyCell);
  } else {
    branchRows.forEach((row, index) => {
      const dataRow = branchSheet.addRow([
        index + 1,
        row.areaName || row.areaId || "—",
        Number(row.storesTotal || 0),
        Number(row.done || 0),
        Number(row.pending || 0),
        Number(row.failed || 0),
        Number(row.completionRate || 0),
      ]);

      const isAlt = index % 2 === 1;
      dataRow.height = 22;
      dataRow.getCell(1).alignment = { horizontal: "center", vertical: "top" };
      dataRow.getCell(3).numFmt = "0";
      dataRow.getCell(4).numFmt = "0";
      dataRow.getCell(5).numFmt = "0";
      dataRow.getCell(6).numFmt = "0";
      dataRow.getCell(7).numFmt = "0.00%";

      dataRow.eachCell((cell, colNumber) => {
        const center = colNumber !== 2;
        const wrap = colNumber === 2;
        styleTableCell(cell, { center, wrap, alt: isAlt });
      });
    });
  }

  const storesSheet = workbook.addWorksheet("Stores", {
    properties: { defaultRowHeight: 20 },
    views: [{ state: "frozen", ySplit: 4, activeCell: "A5" }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  storesSheet.columns = [
    { width: 8 },
    { width: 14 },
    { width: 34 },
    { width: 22 },
    { width: 12 },
    { width: 22 },
    { width: 22 },
    { width: 10 },
    { width: 42 },
  ];

  storesSheet.mergeCells("A1:I1");
  storesSheet.getCell("A1").value = "Store EOD Status";
  styleTitleCell(storesSheet.getCell("A1"));
  storesSheet.getRow(1).height = 26;

  storesSheet.mergeCells("A2:I2");
  storesSheet.getCell("A2").value =
    `Date: ${formatReportDateLabel(reportDate)} | Branch: ${scopeLabel} | Status: ${statusLabel} | Search: ${searchLabel}`;
  styleSubtitleCell(storesSheet.getCell("A2"));
  storesSheet.getRow(2).height = 22;

  storesSheet.mergeCells("A3:I3");
  storesSheet.getCell("A3").value =
    "Columns: Rank, Store Code, Store Name, Branch, Status, Last EOD, Last Sync, Source, Error Message.";
  styleSubtitleCell(storesSheet.getCell("A3"));
  storesSheet.getRow(3).height = 24;

  const storeHeader = storesSheet.getRow(4);
  storeHeader.values = [
    "Rank",
    "Store Code",
    "Store Name",
    "Branch",
    "Status",
    "Last EOD",
    "Last Sync",
    "Source",
    "Error Message",
  ];
  storeHeader.height = 22;
  storeHeader.eachCell((cell) => styleTableHeader(cell));
  storesSheet.autoFilter = "A4:I4";

  if (storeRows.length === 0) {
    storesSheet.mergeCells("A5:I5");
    const emptyCell = storesSheet.getCell("A5");
    emptyCell.value = "No store data for this filter.";
    emptyCell.alignment = { horizontal: "center", vertical: "middle" };
    emptyCell.font = { name: "Arial", italic: true, color: { argb: "64748B" } };
    emptyCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
    setThinBorder(emptyCell);
  } else {
    storeRows.forEach((row, index) => {
      const dataRow = storesSheet.addRow([
        index + 1,
        row.storeCode || "—",
        row.storeName || "—",
        row.areaName || row.areaId || "—",
        formatStatusLabel(row.status),
        formatExportDateTime(row.lastEodAt),
        formatExportDateTime(row.lastSyncAt),
        String(row.source || "-").toUpperCase(),
        row.errorMessage || "—",
      ]);

      const isAlt = index % 2 === 1;
      dataRow.height = row.errorMessage ? 32 : 22;

      dataRow.eachCell((cell, colNumber) => {
        const center = colNumber === 1 || colNumber === 2 || colNumber === 5 || colNumber === 6 || colNumber === 7 || colNumber === 8;
        const wrap = colNumber === 3 || colNumber === 4 || colNumber === 9;
        styleTableCell(cell, { center, wrap, alt: isAlt });
      });
    });
  }

  return workbook;
}

function buildEodExportBase64(buffer) {
  return Buffer.isBuffer(buffer) ? buffer.toString("base64") : Buffer.from(buffer).toString("base64");
}

function buildEodExportFileName(reportDate) {
  const datePart = String(reportDate || toWibDate() || "").slice(0, 10) || toWibDate();
  return `eod_monitor_${datePart}.xlsx`;
}

// Backward-compatible route: GET /eod
exports.getEODMonitor = async (req, res) => {
  // Delegate to /eod/stores behavior
  req.query = {
    ...req.query,
    areaId: req.query.areaId || req.query.area,
    q: req.query.q || req.query.search,
  };
  return exports.getEODStores(req, res);
};

// Backward-compatible route: GET /eod/area
exports.getEODByArea = async (req, res) => {
  return exports.getEODAreas(req, res);
};

// New: GET /eod/stores
exports.getEODStores = async (req, res) => {
  try {
    const { date, areaId, status, q } = req.query;
    const statusFilter = normalizeStatus(status);

    const { page, pageSize } = getPagination(req.query, {
      page: 1,
      pageSize: 50,
      maxPageSize: 200,
    });

    const snap = await fetchEodSnapshot({ date });
    const rows = Array.isArray(snap.rows) ? snap.rows : [];
    const queryDate = snap.queryDate || toWibDate();

    // DEBUG LOGGING
    console.log("EOD Stores Request:", {
      user: req.user?.username,
      role: req.user?.role,
      isAllBranches: req.authz?.isAllBranches,
      scopeBranches: req.authz?.scopeBranches,
      reqAllowedBranches: req.allowedBranches,
      rowsTotal: rows.length,
    });

    const sourceFetchedAt = maxDateValue(rows, "sourceSyncedAt");
    const externalMeta = buildExternalMeta({
      source: "db",
      sourceFetchedAt,
      partial: snap.rows === null,
      warnings:
        snap.rows === null
          ? [{ code: "EOD_DB_UNAVAILABLE", message: "EOD snapshot not available in DB." }]
          : [],
    });

    let results = rows.map(mapEodRowToUi);

    if (areaId) {
      results = results.filter((row) => String(row.areaId) === String(areaId));
    }

    if (q) {
      const needle = String(q).toLowerCase();
      results = results.filter((row) => {
        const code = String(row.storeCode || "").toLowerCase();
        const name = String(row.storeName || "").toLowerCase();
        return code.includes(needle) || name.includes(needle);
      });
    }

    if (statusFilter) {
      results = results.filter((r) => r.status === statusFilter);
    }

    // STRICT SCOPE ENFORCEMENT
    if (req.allowedBranches) {
      results = results.filter((row) => req.allowedBranches.includes(String(row.areaId)));
    }

    const total = results.length;
    const offset = (page - 1) * pageSize;
    const paged = results.slice(offset, offset + pageSize);

    return ok(res, paged, {
      ...buildPaginationMeta({ page, pageSize, total }),
      ...externalMeta,
      date: queryDate,
      timezone: "Asia/Jakarta",
      snapshotMode: snap.mode,
    });
  } catch (error) {
    console.error("EOD Stores Error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Internal Server Error");
  }
};

// New: GET /eod/areas
exports.getEODAreas = async (req, res) => {
  try {
    const { date } = req.query;

    const snap = await fetchEodSnapshot({ date });
    let rows = Array.isArray(snap.rows) ? snap.rows : [];
    const queryDate = snap.queryDate || toWibDate();

    // STRICT SCOPE ENFORCEMENT
    if (req.allowedBranches) {
      rows = rows.filter((row) => req.allowedBranches.includes(String(row.branchId)));
    }

    const sourceFetchedAt = maxDateValue(rows, "sourceSyncedAt");
    const externalMeta = buildExternalMeta({
      source: "db",
      sourceFetchedAt,
      partial: snap.rows === null,
      warnings:
        snap.rows === null
          ? [{ code: "EOD_DB_UNAVAILABLE", message: "EOD snapshot not available in DB." }]
          : [],
    });

    const data = summarizeByBranch(rows);
    data.sort((a, b) => b.completionRate - a.completionRate);
    return ok(res, data, {
      ...externalMeta,
      date: queryDate,
      timezone: "Asia/Jakarta",
      snapshotMode: snap.mode,
    });
  } catch (error) {
    console.error("EOD Areas Error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Internal Server Error");
  }
};

// New: GET /eod/summary-by-branch
exports.getEODSummaryByBranch = async (req, res) => {
  return exports.getEODAreas(req, res);
};

// New: GET /eod/late-stores
exports.getLateEodStores = async (req, res) => {
  try {
    const { date, branchId } = req.query;
    const now = new Date();

    const snap = await fetchEodSnapshot({ date });
    let rows = Array.isArray(snap.rows) ? snap.rows : [];
    const queryDate = snap.queryDate || toWibDate();

    // STRICT SCOPE ENFORCEMENT
    if (req.allowedBranches) {
      rows = rows.filter((row) => req.allowedBranches.includes(String(row.branchId)));
    }

    const sourceFetchedAt = maxDateValue(rows, "sourceSyncedAt");
    const externalMeta = buildExternalMeta({
      source: "db",
      sourceFetchedAt,
      partial: snap.rows === null,
      warnings:
        snap.rows === null
          ? [{ code: "EOD_DB_UNAVAILABLE", message: "EOD snapshot not available in DB." }]
          : [],
    });

    const data = rows
      .filter((row) => {
        if (branchId && String(row.branchId) !== String(branchId)) return false;
        if (row.status === "done") return false;
        if (!row.maxUploadAt) return false;
        return now > row.maxUploadAt;
      })
      .map((row) => ({
        storeCode: row.storeCode,
        storeName: row.storeName,
        branchId: row.branchId,
        branchName: row.branchName || getBranchNameById(row.branchId) || row.branchId,
        status: row.status,
        statusSales: row.statusSales,
        uploadPercent: row.uploadPercent,
        maxUploadAt: row.maxUploadAt ? toWibIso(row.maxUploadAt) : null,
        lastUploadAt: row.uploadAt ? toWibIso(row.uploadAt) : null,
        lateByMinutes: row.maxUploadAt ? Math.floor((now - row.maxUploadAt) / 60000) : null,
      }));

    return ok(res, data, {
      ...externalMeta,
      date: queryDate,
      timezone: "Asia/Jakarta",
      snapshotMode: snap.mode,
    });
  } catch (error) {
    console.error("Late EOD Error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Internal Server Error");
  }
};

// New: GET /eod/history
exports.getEODHistoryByStore = async (req, res) => {
  try {
    const { storeCode, from, to } = req.query;
    if (!storeCode) return fail(res, 400, "BAD_REQUEST", "storeCode is required");

    const endDate = to || toWibDate();
    const startDate = from || toWibDate(new Date(Date.now() - 13 * 24 * 60 * 60 * 1000));

    const rows = await fetchHistoryByStore(storeCode, startDate, endDate);
    if (rows === null) {
      return ok(res, [], {
        storeCode,
        from: startDate,
        to: endDate,
        timezone: "Asia/Jakarta",
        source: "history",
        historyAvailable: false,
      });
    }

    // STRICT SCOPE ENFORCEMENT: Check one row to verify branch access (history should be consistent)
    if (rows.length > 0 && req.allowedBranches) {
      const branchId = rows[0].idcabang;
      if (branchId && !req.allowedBranches.includes(String(branchId))) {
        return fail(res, 403, "FORBIDDEN", "Access denied for this store history");
      }
    }

    const data = rows.map((row) => {
      const uploadPercent = parsePercent(row.persentaseuploadstok);
      const done = isComplete(row.statussales, uploadPercent);
      return {
        date: formatDateOnly(row.recorded_date),
        businessDate: formatDateOnly(row.tglbisnis),
        status: done ? "done" : "failed",
        statusSales: row.statussales || null,
        uploadPercent,
        storeName: row.namatoko || null,
        branchId: row.idcabang != null ? String(row.idcabang) : null,
        branchName: row.idcabang ? getBranchNameById(String(row.idcabang)) : null,
        area: row.area || null,
        regional: row.regional || null,
      };
    });

    return ok(res, data, {
      storeCode,
      from: startDate,
      to: endDate,
      timezone: "Asia/Jakarta",
      source: "history",
    });
  } catch (error) {
    console.error("EOD History Error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Internal Server Error");
  }
};

// New: GET /eod/export
exports.exportEod = async (req, res) => {
  try {
    const date = req.query.date || null;
    const areaId = req.query.areaId || req.query.branchId || req.query.area || null;
    const status = normalizeStatus(req.query.status);
    const search = String(req.query.q || req.query.search || "").trim();
    const snap = await fetchEodSnapshot({ date });
    let rows = Array.isArray(snap.rows) ? snap.rows : [];
    const queryDate = snap.queryDate || toWibDate();

    // STRICT SCOPE ENFORCEMENT
    if (req.allowedBranches) {
      rows = rows.filter((row) => req.allowedBranches.includes(String(row.branchId)));
    }

    const scopeRows = rows.filter((row) => !areaId || String(row.branchId) === String(areaId));
    const visibleRows = scopeRows.filter((row) => {
      if (status && row.status !== status) return false;
      if (!search) return true;
      const needle = search.toLowerCase();
      const code = String(row.storeCode || "").toLowerCase();
      const name = String(row.storeName || "").toLowerCase();
      return code.includes(needle) || name.includes(needle);
    });

    const branchRows = summarizeByBranch(scopeRows).sort(
      (a, b) => b.completionRate - a.completionRate
    );
    const doneCount = scopeRows.filter((row) => row.status === "done").length;
    const pendingCount = scopeRows.filter((row) => row.status === "pending").length;
    const failedCount = scopeRows.filter((row) => row.status === "failed").length;
    const scopeBranchName = areaId
      ? branchRows[0]?.areaName || getBranchNameById(String(areaId)) || String(areaId)
      : "All Branches";

    const workbook = buildEodWorkbook({
      reportDate: queryDate,
      generatedAt: formatExportDateTime(new Date()),
      scopeLabel: formatLabel(scopeBranchName, "All Branches"),
      statusLabel: formatStatusLabel(status),
      searchLabel: formatLabel(search, "All"),
      scopeStoreCount: scopeRows.length,
      visibleStoreCount: visibleRows.length,
      doneCount,
      pendingCount,
      failedCount,
      completionRateText: `${scopeRows.length > 0 ? Math.round((doneCount / scopeRows.length) * 100) : 0}%`,
      branchRows,
      storeRows: visibleRows.map((row) => ({
        ...mapEodRowToUi(row),
        source: row.source || "db",
      })),
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return ok(res, {
      fileName: buildEodExportFileName(queryDate),
      contentType: EOD_EXPORT_MIME,
      contentBase64: buildEodExportBase64(buffer),
    });
  } catch (error) {
    console.error("EOD Export Error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Export Failed");
  }
};

exports.manualSync = async (req, res) => {
  try {
    const { date, scope, storeCode, store_code } = req.body;
    const targetStoreCode = storeCode || store_code;
    const queryDate = date || toWibDate();
    const allowedBranches = req.allowedBranches ?? getAllowedBranches(req.authz);
    const isScopedUser = allowedBranches !== null;

    if (isScopedUser) {
      return fail(res, 403, "FORBIDDEN", "Global EOD sync requires all-branch scope");
    }

    if (targetStoreCode) {
      const scopeCheck = await ensureStoreBranchAccess(req, targetStoreCode, { failClosed: true });
      if (!scopeCheck.ok) {
        return fail(
          res,
          scopeCheck.status,
          scopeCheck.code,
          scopeCheck.message,
          scopeCheck.details
        );
      }
    }

    await fetchEodSnapshot({ date: queryDate });

    if (SystemLog) {
      await SystemLog.create({
        level: "INFO",
        component: "API",
        message: `EOD sync refresh requested via the internal data API (scope=${scope || "all"})`,
        metadata: {
          date: queryDate,
          scope: scope || "all",
          storeCode: targetStoreCode || null,
          requestedBy: req.user?.username || null,
        },
      });
    }

    return ok(res, {
      queued: true,
      scope: scope || "all",
      storeCode: targetStoreCode || null,
      date: queryDate,
    });
  } catch (error) {
    console.error("Manual Sync Error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Sync Failed");
  }
};

exports.getEODStoreDetail = async (req, res) => {
  try {
    const { storeCode } = req.params;
    const { date } = req.query;
    const snap = await fetchEodSnapshot({ date });
    const rows = Array.isArray(snap.rows) ? snap.rows : [];
    const queryDate = snap.queryDate || toWibDate();
    if (!storeCode) return fail(res, 400, "BAD_REQUEST", "storeCode is required");

    const storeRow = rows.find((row) => String(row.storeCode) === String(storeCode));
    if (!storeRow) return fail(res, 404, "NOT_FOUND", "Store not found");

    // STRICT SCOPE ENFORCEMENT
    if (req.allowedBranches && !req.allowedBranches.includes(String(storeRow.branchId))) {
      return fail(res, 403, "FORBIDDEN", "Access denied for this store");
    }

    const employees = (await dataDb.fetchEmployeesAll()) || [];
    const employeeIndex = new Map(employees.map((e) => [String(e.empid), e]));
    const picEmployee =
      employeeIndex.get(String(storeRow.nikRh || "")) ||
      employeeIndex.get(String(storeRow.nikAc || ""));
    const picName = picEmployee?.name || null;

    const sourceFetchedAt = maxDateValue(rows, "sourceSyncedAt");
    const externalMeta = buildExternalMeta({
      source: "db",
      sourceFetchedAt,
      partial: snap.rows === null,
      warnings:
        snap.rows === null
          ? [{ code: "EOD_DB_UNAVAILABLE", message: "EOD snapshot not available in DB." }]
          : [],
    });

    return ok(
      res,
      {
        store: {
          storeId: Number.isFinite(Number(storeRow.storeCode))
            ? Number(storeRow.storeCode)
            : storeRow.storeCode,
          storeCode: storeRow.storeCode,
          storeName: storeRow.storeName,
          areaId: storeRow.branchId,
          areaName:
            storeRow.branchName || getBranchNameById(storeRow.branchId) || storeRow.branchId,
          region: storeRow.regional,
          address: null,
          picName,
          phone: null,
          status: "active",
        },
        eod: {
          date: queryDate,
          status: storeRow.status,
          lastEodAt: storeRow.eodAt ? toWibIso(storeRow.eodAt) : null,
          lastSyncAt: storeRow.uploadAt ? toWibIso(storeRow.uploadAt) : null,
          source: "internal-data",
          errorMessage: storeRow.status === "failed" ? "EOD not completed by deadline" : null,
        },
      },
      { ...externalMeta, date: queryDate, timezone: "Asia/Jakarta", snapshotMode: snap.mode }
    );
  } catch (error) {
    console.error("EOD Detail Error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Internal Server Error");
  }
};

exports.getEODTrend = async (req, res) => {
  try {
    const rawDays = parseInt(req.query.days, 10);
    const days = Number.isFinite(rawDays) && rawDays > 0 ? Math.min(rawDays, 30) : 7;
    const allowedBranches = req.allowedBranches ?? getAllowedBranches(req.authz);
    const isScopedUser = allowedBranches !== null;

    if (isScopedUser) {
      const dayKeys = [];
      const today = new Date();
      for (let i = 0; i < days; i += 1) {
        const day = new Date(today.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000);
        dayKeys.push(toWibDate(day));
      }

      const data = [];
      for (const dateKey of dayKeys) {
        const snap = await fetchEodSnapshot({ date: dateKey });
        const scopedRows = (Array.isArray(snap.rows) ? snap.rows : []).filter(
          (row) => row.branchId != null && allowedBranches.includes(String(row.branchId))
        );

        const done = scopedRows.filter((row) => row.status === "done").length;
        const failed = scopedRows.filter((row) => row.status === "failed").length;
        const pending = Math.max(0, scopedRows.length - done - failed);
        data.push({ date: dateKey, done, failed, pending, total: scopedRows.length });
      }

      return ok(res, data, { timezone: "Asia/Jakarta" });
    }

    const today = new Date();
    const endDate = toWibDate(today);
    const startDate = toWibDate(new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000));

    const totalStores = await Store.count({ where: { is_active: true } });

    const logs = await EODLog.findAll({
      where: { date: { [Op.between]: [startDate, endDate] } },
      attributes: ["date", "status", [Sequelize.fn("COUNT", Sequelize.col("status")), "count"]],
      group: ["date", "status"],
      order: [["date", "ASC"]],
    });

    const counts = {};
    for (const log of logs) {
      const dateKey = log.date;
      if (!counts[dateKey]) {
        counts[dateKey] = { done: 0, failed: 0 };
      }
      if (log.status === "DONE") counts[dateKey].done = parseInt(log.dataValues.count, 10);
      if (log.status === "FAILED") counts[dateKey].failed = parseInt(log.dataValues.count, 10);
    }

    const data = [];
    for (let i = 0; i < days; i += 1) {
      const day = new Date(today.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      const dateKey = toWibDate(day);
      const done = counts[dateKey]?.done || 0;
      const failed = counts[dateKey]?.failed || 0;
      const pending = Math.max(0, totalStores - done - failed);
      data.push({ date: dateKey, done, failed, pending, total: totalStores });
    }

    return ok(res, data, { timezone: "Asia/Jakarta" });
  } catch (error) {
    console.error("EOD Trend Error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Internal Server Error");
  }
};

exports.retryEOD = async (req, res) => {
  try {
    const { storeCode, date } = req.body || {};
    if (!storeCode) return fail(res, 400, "BAD_REQUEST", "storeCode is required");
    const queryDate = date || toWibDate();

    const snap = await fetchEodSnapshot({ date: queryDate });
    const { rows } = snap;
    const targetRow = rows.find((row) => String(row.storeCode) === String(storeCode));
    if (!targetRow) return fail(res, 404, "NOT_FOUND", "Store not found");

    const scopeCheck = ensureBranchAccessForBranchId(req, targetRow.branchId, { failClosed: true });
    if (!scopeCheck.ok) {
      return fail(res, scopeCheck.status, scopeCheck.code, scopeCheck.message, scopeCheck.details);
    }

    if (SystemLog) {
      await SystemLog.create({
        level: "WARNING",
        component: "API",
        message: `EOD retry refresh requested via the internal data API for ${storeCode} (date=${queryDate})`,
        metadata: { storeCode, date: queryDate, requestedBy: req.user?.username || null },
      });
    }

    return ok(res, { queued: true, storeCode, date: queryDate });
  } catch (error) {
    console.error("EOD Retry Error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Retry Failed");
  }
};

// New: POST /eod/retry-batch
exports.retryEodBatch = async (req, res) => {
  try {
    const { storeCodes, stores, date } = req.body || {};
    const queryDate = date || toWibDate();

    let items = [];
    if (Array.isArray(storeCodes)) {
      items = storeCodes.map((code) => ({ storeCode: code, date: queryDate }));
    }
    if (Array.isArray(stores)) {
      items = items.concat(
        stores.map((store) => ({
          storeCode: store.storeCode,
          date: store.date || queryDate,
        }))
      );
    }

    const cleaned = items
      .filter((item) => item.storeCode)
      .map((item) => ({
        storeCode: String(item.storeCode),
        date: item.date || queryDate,
      }));

    if (cleaned.length === 0) {
      return fail(res, 400, "BAD_REQUEST", "storeCodes or stores are required");
    }

    const snap = await fetchEodSnapshot({ date: queryDate });
    const { rows } = snap;
    const rowByStore = new Map(rows.map((row) => [String(row.storeCode), row]));
    const accepted = [];
    const rejected = [];
    const forbidden = [];

    for (const item of cleaned) {
      const row = rowByStore.get(String(item.storeCode));
      if (!row) {
        rejected.push(item);
        continue;
      }

      const scopeCheck = ensureBranchAccessForBranchId(req, row.branchId, { failClosed: true });
      if (!scopeCheck.ok) {
        forbidden.push(String(item.storeCode));
        continue;
      }

      accepted.push(item);
    }

    if (forbidden.length > 0) {
      return fail(res, 403, "FORBIDDEN", "Access denied for one or more stores", {
        storeCodes: Array.from(new Set(forbidden)),
        deniedCount: forbidden.length,
      });
    }

    if (SystemLog) {
      await SystemLog.create({
        level: "WARNING",
        component: "API",
        message: `EOD batch retry refresh requested via the internal data API (${accepted.length} accepted, ${rejected.length} rejected)`,
        metadata: {
          date: queryDate,
          accepted: accepted.map((item) => item.storeCode),
          rejected: rejected.map((item) => item.storeCode),
          requestedBy: req.user?.username || null,
        },
      });
    }

    return ok(res, {
      queued: accepted.length,
      accepted,
      rejected,
      date: queryDate,
    });
  } catch (error) {
    console.error("EOD Batch Retry Error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Retry Failed");
  }
};
