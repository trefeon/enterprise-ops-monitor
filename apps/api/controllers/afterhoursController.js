/**
 * After-Hours PC Controller
 *
 * Handles API endpoints for viewing after-hours PC violations.
 */
const db = require("../models");
const { ok, fail } = require("../utils/response");
const { runAfterhoursCheck } = require("../services/afterhoursService");
const {
  generateMonthlyReport,
  resolveMonthlyReportWindow,
} = require("../services/afterhoursReportService");
const { toWibDate } = require("../utils/time");
const { getRequestAllowedBranches } = require("../middleware/rbac");
const ExcelJS = require("exceljs");

const CONFIG_KEYS = [
  "notify_enabled",
  "telegram_bot_token",
  "telegram_chat_ids",
  "telegram_template",
  "telegram_template_initial",
  "telegram_template_final",
  "telegram_template_stage_1",
  "telegram_template_stage_2",
  "telegram_template_stage_3",
  "telegram_template_stage_4",
  "whatsapp_api_url",
  "whatsapp_api_key",
  "whatsapp_api_secret",
  "whatsapp_targets",
  "whatsapp_template",
  "whatsapp_template_initial",
  "whatsapp_template_final",
  "whatsapp_template_stage_1",
  "whatsapp_template_stage_2",
  "whatsapp_template_stage_3",
  "whatsapp_template_stage_4",
  "monthly_report_whatsapp_targets",
  "first_warning_time",
  "final_warning_time",
  "warning_schedule_times",
  "check_time",
];

const MONTHLY_REPORT_EXPORT_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function toBool(value, fallback = false) {
  if (value == null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") {
    return false;
  }
  return fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDailyTime(value, fallback = "") {
  const raw = value == null ? "" : String(value).trim();
  if (!raw) return fallback;
  if (!/^\d{2}:\d{2}$/.test(raw)) return fallback;
  return raw;
}

function parseMonthlyReportWindowStart(value, fallback = "") {
  const raw = value == null ? "" : String(value).trim();
  if (!raw) return fallback;

  const match = raw.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return fallback;

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const seconds = Number.parseInt(match[3] || "0", 10);
  if (hours > 23 || minutes > 59 || seconds > 59) return fallback;

  return `${match[1]}:${match[2]}:${String(seconds).padStart(2, "0")}`;
}

function parseScheduleValue(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Not JSON array, fallback to CSV.
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueOrderedTimes(source) {
  const seen = new Set();
  const result = [];

  for (const raw of source || []) {
    const parsed = parseDailyTime(raw, "");
    if (!parsed || seen.has(parsed)) continue;
    seen.add(parsed);
    result.push(parsed);
  }

  return result;
}

function resolveReportMonth(rawMonth) {
  const currentWibMonth = (toWibDate() || new Date().toISOString().slice(0, 10)).slice(0, 7);
  const raw = String(rawMonth || "").trim();
  if (/^\d{4}-\d{2}$/.test(raw)) {
    return `${raw}-01`;
  }
  return `${currentWibMonth}-01`;
}

function normalizeAllowedBranches(allowedBranches) {
  if (allowedBranches === null) return null;
  if (!Array.isArray(allowedBranches)) return [];
  return allowedBranches.map((item) => String(item)).filter(Boolean);
}

function buildMonthlyReportWhere(reportMonth, branch, search, allowedBranches = null) {
  let where = "WHERE report_month = $1";
  const bind = [reportMonth];
  let paramIdx = 2;

  if (allowedBranches !== null) {
    if (!Array.isArray(allowedBranches) || allowedBranches.length === 0) {
      where += " AND 1=0";
    } else {
      where += ` AND branch_id::text = ANY($${paramIdx}::text[])`;
      bind.push(allowedBranches);
      paramIdx += 1;
    }
  }

  if (branch) {
    where += ` AND branch_id = $${paramIdx}`;
    bind.push(branch);
    paramIdx += 1;
  }

  if (search) {
    where += ` AND (store_code ILIKE $${paramIdx} OR store_name ILIKE $${paramIdx})`;
    bind.push(`%${search}%`);
    paramIdx += 1;
  }

  return { where, bind, nextParamIdx: paramIdx };
}

function normalizeViolationDates(value) {
  const candidates = [];

  if (Array.isArray(value)) {
    candidates.push(...value);
  } else if (value && typeof value === "object") {
    candidates.push(...Object.values(value));
  } else {
    const raw = String(value || "").trim();
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        candidates.push(...parsed);
      } else if (parsed && typeof parsed === "object") {
        candidates.push(...Object.values(parsed));
      } else {
        candidates.push(raw);
      }
    } catch {
      candidates.push(...raw.split(","));
    }
  }

  const seen = new Set();
  const normalized = [];
  for (const item of candidates) {
    const text = item instanceof Date ? item.toISOString().slice(0, 10) : String(item || "").trim();
    if (!text) continue;
    const dateText = /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : text;
    if (seen.has(dateText)) continue;
    seen.add(dateText);
    normalized.push(dateText);
  }

  return normalized;
}

function normalizeViolationTimestamps(value) {
  const candidates = [];

  if (Array.isArray(value)) {
    candidates.push(...value);
  } else if (value && typeof value === "object") {
    candidates.push(...Object.values(value));
  } else {
    const raw = String(value || "").trim();
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        candidates.push(...parsed);
      } else if (parsed && typeof parsed === "object") {
        candidates.push(...Object.values(parsed));
      } else {
        candidates.push(raw);
      }
    } catch {
      candidates.push(...raw.split(","));
    }
  }

  const seen = new Set();
  const normalized = [];
  for (const item of candidates) {
    const rawValue = item instanceof Date ? item.toISOString() : String(item || "").trim();
    if (!rawValue) continue;

    let normalizedValue = rawValue;
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
      normalizedValue = formatExportDateOnly(rawValue);
    } else {
      const parsed = new Date(rawValue);
      if (!Number.isNaN(parsed.getTime())) {
        normalizedValue = formatExportDateTime(parsed.toISOString());
      }
    }

    if (seen.has(normalizedValue)) continue;
    seen.add(normalizedValue);
    normalized.push(normalizedValue);
  }

  return normalized;
}

function formatReportWindowLabel(start, endExclusive) {
  const startLabel = parseDailyTime(start, "");
  const endLabel = parseDailyTime(endExclusive, "");
  if (!startLabel && !endLabel) return "—";
  if (!startLabel) return endLabel;
  if (!endLabel) return startLabel;
  return `${startLabel} - ${endLabel}`;
}

function formatReportMonthLabel(reportMonth) {
  const normalized = String(reportMonth || "").slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(normalized)) return normalized || "—";

  try {
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "UTC",
      month: "long",
      year: "numeric",
    }).format(new Date(`${normalized}-01T00:00:00Z`));
  } catch {
    return normalized;
  }
}

function formatExportDateTime(value) {
  if (!value) return "—";
  const raw = String(value || "").trim();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw || "—";

  try {
    const parts = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);

    const map = {};
    for (const part of parts) {
      map[part.type] = part.value;
    }

    const hour = map.hour === "24" ? "00" : map.hour;
    return `${map.day} ${map.month} ${map.year} ${hour}:${map.minute} WIB`;
  } catch {
    return raw || "—";
  }
}

function formatExportDateOnly(value) {
  if (!value) return "—";
  const raw = String(value || "").trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00+07:00`) : new Date(raw);

  if (Number.isNaN(date.getTime())) return raw || "—";

  try {
    const parts = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).formatToParts(date);

    const map = {};
    for (const part of parts) {
      map[part.type] = part.value;
    }

    return `${map.day} ${map.month} ${map.year}`;
  } catch {
    return raw || "—";
  }
}

async function loadMonthlyReportRows({ reportMonth, branch, search, limit, allowedBranches }) {
  const { where, bind, nextParamIdx } = buildMonthlyReportWhere(
    reportMonth,
    branch,
    search,
    allowedBranches
  );
  let sql = `SELECT store_code, store_name, branch_id, branch_name,
            violation_count, violation_dates, violation_timestamps,
            report_window_start, report_window_end_exclusive, generated_at
     FROM afterhours_monthly_report
     ${where}
     ORDER BY violation_count DESC, store_name ASC, store_code ASC`;

  if (Number.isFinite(limit)) {
    sql += `\n     LIMIT $${nextParamIdx}`;
    bind.push(limit);
  }

  const [rows] = await db.sequelize.query(sql, { bind });
  return rows;
}

async function loadMonthlyReportSummary({ reportMonth, branch, search, allowedBranches }) {
  const { where, bind } = buildMonthlyReportWhere(reportMonth, branch, search, allowedBranches);
  const [summaryRows] = await db.sequelize.query(
    `SELECT COUNT(*)::int AS total_stores,
            COALESCE(SUM(violation_count), 0)::int AS total_violation_days,
            MAX(report_window_start) AS report_window_start,
            MAX(report_window_end_exclusive) AS report_window_end_exclusive,
            MAX(generated_at) AS generated_at
     FROM afterhours_monthly_report
     ${where}`,
    { bind }
  );

  return (
    summaryRows[0] || {
      total_stores: 0,
      total_violation_days: 0,
      report_window_start: null,
      report_window_end_exclusive: null,
      generated_at: null,
    }
  );
}

async function resolveMonthlyReportWindowSummary(summaryRow) {
  const hasWindowStart = Boolean(summaryRow?.report_window_start);
  const hasWindowEndExclusive = Boolean(summaryRow?.report_window_end_exclusive);
  if (hasWindowStart && hasWindowEndExclusive) {
    return summaryRow;
  }

  const fallbackWindow = await resolveMonthlyReportWindow(db.sequelize, {});
  return {
    ...summaryRow,
    report_window_start:
      summaryRow?.report_window_start || fallbackWindow.afterhoursWindowStart.slice(0, 5),
    report_window_end_exclusive:
      summaryRow?.report_window_end_exclusive ||
      fallbackWindow.afterhoursWindowEndExclusive.slice(0, 5),
  };
}

async function ensureMonthlyReportExists(reportMonth) {
  const targetMonth = String(reportMonth || "").slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(targetMonth)) return null;
  return generateMonthlyReport(db.sequelize, { targetMonth });
}

function setThinBorder(cell) {
  cell.border = {
    top: { style: "thin", color: { argb: "D1D5DB" } },
    left: { style: "thin", color: { argb: "D1D5DB" } },
    bottom: { style: "thin", color: { argb: "D1D5DB" } },
    right: { style: "thin", color: { argb: "D1D5DB" } },
  };
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

function buildMonthlyReportWorkbook({ reportMonth, branch, search, summary, rows }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Enterprise Ops Monitor";
  workbook.lastModifiedBy = "Enterprise Ops Monitor";
  workbook.created = new Date();
  workbook.modified = new Date();

  const monthLabel = formatReportMonthLabel(reportMonth);
  const branchLabel = branch ? `Branch ${branch}` : "All Branches";
  const searchLabel = search ? search : "All";
  const generatedAt = formatExportDateTime(summary?.generated_at || rows[0]?.generated_at || null);
  const reportWindowLabel = formatReportWindowLabel(
    summary?.report_window_start || rows[0]?.report_window_start || null,
    summary?.report_window_end_exclusive || rows[0]?.report_window_end_exclusive || null
  );

  const summarySheet = workbook.addWorksheet("Summary", {
    properties: { defaultRowHeight: 20 },
    views: [{ state: "frozen", ySplit: 3 }],
  });
  summarySheet.columns = [{ width: 24 }, { width: 42 }, { width: 24 }, { width: 42 }];
  summarySheet.mergeCells("A1:D1");
  summarySheet.getCell("A1").value = "After-Hours Monthly Report";
  styleTitleCell(summarySheet.getCell("A1"));
  summarySheet.getRow(1).height = 26;

  summarySheet.mergeCells("A2:D2");
  summarySheet.getCell("A2").value =
    `Month: ${monthLabel} | Branch: ${branchLabel} | Search: ${searchLabel}`;
  styleSubtitleCell(summarySheet.getCell("A2"));
  summarySheet.getRow(2).height = 24;

  summarySheet.mergeCells("A3:D3");
  summarySheet.getCell("A3").value = `Generated at ${generatedAt} | Export format: XLSX`;
  styleSubtitleCell(summarySheet.getCell("A3"));
  summarySheet.getRow(3).height = 22;

  const summaryPairs = [
    ["Report Month", monthLabel, "Generated At", generatedAt],
    ["Branch Filter", branchLabel, "Search", searchLabel],
    [
      "Violation Window",
      reportWindowLabel,
      "Report Scope",
      branch ? `Branch ${branch}` : "All branches",
    ],
    [
      "Total Stores",
      Number(summary?.total_stores || 0),
      "Total Violation Days",
      Number(summary?.total_violation_days || 0),
    ],
    [
      "Exported Rows",
      Number(rows.length || 0),
      "Window End",
      summary?.report_window_end_exclusive || rows[0]?.report_window_end_exclusive || "—",
    ],
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

  const rankingSheet = workbook.addWorksheet("Ranking", {
    properties: { defaultRowHeight: 20 },
    views: [{ state: "frozen", ySplit: 4, activeCell: "A5" }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  rankingSheet.columns = [
    { width: 8 },
    { width: 16 },
    { width: 36 },
    { width: 22 },
    { width: 12 },
    { width: 38 },
    { width: 36 },
  ];

  rankingSheet.mergeCells("A1:G1");
  rankingSheet.getCell("A1").value = "Monthly Violation Ranking";
  styleTitleCell(rankingSheet.getCell("A1"));
  rankingSheet.getRow(1).height = 26;

  rankingSheet.mergeCells("A2:G2");
  rankingSheet.getCell("A2").value =
    `Month: ${monthLabel} | Branch: ${branchLabel} | Search: ${searchLabel} | Window: ${reportWindowLabel}`;
  styleSubtitleCell(rankingSheet.getCell("A2"));
  rankingSheet.getRow(2).height = 22;

  rankingSheet.mergeCells("A3:G3");
  rankingSheet.getCell("A3").value =
    "Columns: Rank, Store Code, Store Name, Branch, Violation Days, Violation Dates, Violation Timestamps (WIB).";
  styleSubtitleCell(rankingSheet.getCell("A3"));
  rankingSheet.getRow(3).height = 28;

  const headerRow = rankingSheet.getRow(4);
  headerRow.values = [
    "Rank",
    "Store Code",
    "Store Name",
    "Branch",
    "Violation Days",
    "Violation Dates",
    "Violation Timestamps (WIB)",
  ];
  headerRow.height = 22;
  headerRow.eachCell((cell) => styleTableHeader(cell));
  rankingSheet.autoFilter = "A4:G4";

  if (rows.length === 0) {
    rankingSheet.mergeCells("A5:G5");
    rankingSheet.getRow(5).height = 24;
    const emptyCell = rankingSheet.getCell("A5");
    emptyCell.value = "No report data for this filter.";
    emptyCell.alignment = { horizontal: "center", vertical: "middle" };
    emptyCell.font = { name: "Arial", italic: true, color: { argb: "64748B" } };
    emptyCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
    setThinBorder(emptyCell);
  } else {
    rows.forEach((row, index) => {
      const rankNumber = Number.isFinite(Number(row.rank)) ? Number(row.rank) : index + 1;
      const violationDates = normalizeViolationDates(row.violation_dates);
      const violationTimestamps = normalizeViolationTimestamps(
        row.violation_timestamps || row.violation_dates
      );
      const datesText = violationDates.length > 0 ? violationDates.join("\n") : "—";
      const timestampsText = violationTimestamps.length > 0 ? violationTimestamps.join("\n") : "—";
      const dataRow = rankingSheet.addRow([
        rankNumber,
        row.store_code,
        row.store_name || "—",
        row.branch_name || row.branch_id || "—",
        Number(row.violation_count || 0),
        datesText,
        timestampsText,
      ]);

      const isAlt = index % 2 === 1;
      dataRow.height = Math.max(
        22,
        18 + Math.max(violationDates.length, violationTimestamps.length) * 10
      );

      dataRow.eachCell((cell, colNumber) => {
        const center = colNumber === 1 || colNumber === 5;
        const wrap = colNumber === 3 || colNumber === 4 || colNumber === 6 || colNumber === 7;
        styleTableCell(cell, { center, wrap, alt: isAlt });
      });
    });
  }

  return workbook;
}

async function buildMonthlyReportExportBuffer({ reportMonth, branch, search, summary, rows }) {
  const workbook = buildMonthlyReportWorkbook({ reportMonth, branch, search, summary, rows });
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

function buildMonthlyReportExportBase64(buffer) {
  return Buffer.isBuffer(buffer)
    ? buffer.toString("base64")
    : Buffer.from(buffer).toString("base64");
}

function buildMonthlyReportExportFileName(reportMonth) {
  return `afterhours_report_${String(reportMonth || "").slice(0, 7)}.xlsx`;
}

async function loadWarningStageTimes(sequelize) {
  const [rows] = await sequelize.query(
    `SELECT key, value FROM afterhours_config WHERE key = ANY($1)`,
    { bind: [["first_warning_time", "final_warning_time", "warning_schedule_times"]] }
  );

  const cfg = {};
  for (const row of rows) cfg[row.key] = row.value;

  const scheduleTimes = uniqueOrderedTimes(parseScheduleValue(cfg.warning_schedule_times));
  if (scheduleTimes.length === 0) {
    throw new Error("Missing after-hours warning_schedule_times configuration");
  }

  return scheduleTimes.slice(0, 4);
}

/**
 * GET /api/afterhours
 * List after-hours violations with optional filters.
 * Query params: date (YYYY-MM-DD), branch, search, page, pageSize
 */
async function listViolations(req, res) {
  const date = req.query.date || toWibDate();
  const branch = req.query.branch || null;
  const search = req.query.search || null;
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || "50", 10)));
  const offset = (page - 1) * pageSize;
  const allowedBranches = normalizeAllowedBranches(getRequestAllowedBranches(req));

  if (allowedBranches !== null) {
    if (allowedBranches.length === 0) {
      return ok(res, {
        violations: [],
        pagination: { page, pageSize, total: 0, totalPages: 0 },
        filters: { date, branch, search },
      });
    }
    if (branch && !allowedBranches.includes(String(branch))) {
      return ok(res, {
        violations: [],
        pagination: { page, pageSize, total: 0, totalPages: 0 },
        filters: { date, branch, search },
      });
    }
  }

  let where = "WHERE check_date = $1";
  const bind = [date];
  let paramIdx = 2;

  if (allowedBranches !== null) {
    where += ` AND branch_id::text = ANY($${paramIdx}::text[])`;
    bind.push(allowedBranches);
    paramIdx += 1;
  }

  if (branch) {
    where += ` AND branch_id = $${paramIdx}`;
    bind.push(branch);
    paramIdx += 1;
  }

  if (search) {
    where += ` AND (store_code ILIKE $${paramIdx} OR store_name ILIKE $${paramIdx})`;
    bind.push(`%${search}%`);
    paramIdx += 1;
  }

  const [countRows] = await db.sequelize.query(
    `SELECT COUNT(*)::int AS total FROM afterhours_pc_log ${where}`,
    { bind }
  );
  const total = countRows[0]?.total || 0;

  const [rows] = await db.sequelize.query(
    `SELECT id, check_date, store_code, store_name, branch_id, branch_name,
            last_sync_at, detected_at, notified
     FROM afterhours_pc_log
     ${where}
     ORDER BY last_sync_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    { bind }
  );

  return ok(res, {
    violations: rows,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    filters: { date, branch, search },
  });
}

/**
 * GET /api/afterhours/summary
 * Aggregated stats per branch for a given date.
 * Query params: date (YYYY-MM-DD)
 */
async function getSummary(req, res) {
  const date = req.query.date || toWibDate();
  const branch = req.query.branch || null;
  const allowedBranches = normalizeAllowedBranches(getRequestAllowedBranches(req));

  if (allowedBranches !== null) {
    if (allowedBranches.length === 0) {
      return ok(res, { date, totalViolations: 0, byBranch: [] });
    }
    if (branch && !allowedBranches.includes(String(branch))) {
      return ok(res, { date, totalViolations: 0, byBranch: [] });
    }
  }

  let where = "WHERE check_date = $1";
  const bind = [date];
  let paramIdx = 2;

  if (allowedBranches !== null) {
    where += ` AND branch_id::text = ANY($${paramIdx}::text[])`;
    bind.push(allowedBranches);
    paramIdx += 1;
  }

  if (branch) {
    where += ` AND branch_id = $${paramIdx}`;
    bind.push(branch);
    paramIdx += 1;
  }

  const [rows] = await db.sequelize.query(
    `SELECT branch_id, branch_name, COUNT(*)::int AS violation_count,
            MIN(last_sync_at) AS earliest_sync, MAX(last_sync_at) AS latest_sync
     FROM afterhours_pc_log
     ${where}
     GROUP BY branch_id, branch_name
     ORDER BY violation_count DESC`,
    { bind }
  );

  const [totalRow] = await db.sequelize.query(
    `SELECT COUNT(*)::int AS total FROM afterhours_pc_log ${where}`,
    { bind }
  );

  return ok(res, {
    date,
    totalViolations: totalRow[0]?.total || 0,
    byBranch: rows,
  });
}

/**
 * GET /api/afterhours/dates
 * List available check dates for the date picker.
 * Query params: limit (default 30)
 */
async function getAvailableDates(req, res) {
  const limit = Math.min(90, Math.max(1, parseInt(req.query.limit || "30", 10)));
  const allowedBranches = normalizeAllowedBranches(getRequestAllowedBranches(req));

  if (allowedBranches !== null && allowedBranches.length === 0) {
    return ok(res, { dates: [] });
  }

  const bind = [];
  let where = "";
  let limitParam = 1;

  if (allowedBranches !== null) {
    where = "WHERE branch_id::text = ANY($1::text[])";
    bind.push(allowedBranches);
    limitParam = 2;
  }

  bind.push(limit);

  const [rows] = await db.sequelize.query(
    `SELECT DISTINCT check_date, COUNT(*)::int AS violation_count
     FROM afterhours_pc_log
     ${where}
     GROUP BY check_date
     ORDER BY check_date DESC
     LIMIT $${limitParam}`,
    { bind }
  );

  return ok(res, { dates: rows });
}

/**
 * POST /api/afterhours/check
 * Manually trigger an after-hours check (admin only).
 */
async function triggerCheck(req, res) {
  try {
    const runAllStages = toBool(req.body?.runAllStages, false);
    if (runAllStages) {
      const rawDelayMs = Number.parseInt(String(req.body?.stageDelayMs ?? "2000"), 10);
      const stageDelayMs =
        Number.isFinite(rawDelayMs) && rawDelayMs >= 0 ? Math.min(rawDelayMs, 10_000) : 2000;

      const stageTimes = await loadWarningStageTimes(db.sequelize);
      const totalStages = stageTimes.length;
      const stageResults = [];

      for (let idx = 0; idx < stageTimes.length; idx += 1) {
        const warningStage = idx + 1;
        const warningType = warningStage >= totalStages ? "final" : "initial";
        const result = await runAfterhoursCheck(db.sequelize, {
          warningType,
          warningStage,
          totalStages,
          scheduledTime: stageTimes[idx],
        });

        const notifyResults =
          result.notifyResults && !result.notifyResults.skipped ? result.notifyResults : {};
        let telegramAttempt = 0;
        let telegramSuccess = 0;
        let whatsappAttempt = 0;
        let whatsappSuccess = 0;

        for (const branchNotify of Object.values(notifyResults)) {
          if (!branchNotify || typeof branchNotify !== "object") continue;

          if (branchNotify.telegram != null) {
            telegramAttempt += 1;
            if (branchNotify.telegram?.ok) telegramSuccess += 1;
          }

          if (branchNotify.whatsapp != null) {
            whatsappAttempt += 1;
            if (branchNotify.whatsapp?.ok) whatsappSuccess += 1;
          }
        }

        stageResults.push({
          warningStage,
          totalStages,
          warningType,
          scheduledTime: stageTimes[idx],
          totalViolations: result.totalViolations,
          branchCount: result.branchCount,
          telegramAttempt,
          telegramSuccess,
          whatsappAttempt,
          whatsappSuccess,
        });

        if (stageDelayMs > 0 && idx < stageTimes.length - 1) {
          await sleep(stageDelayMs);
        }
      }

      return ok(res, {
        runMode: "all_stages",
        stageDelayMs,
        stageResults,
        totalViolations: stageResults[stageResults.length - 1]?.totalViolations || 0,
        branchCount: stageResults[stageResults.length - 1]?.branchCount || 0,
      });
    }

    const warningStageRaw = Number.parseInt(String(req.body?.warningStage ?? ""), 10);
    const warningStage =
      Number.isFinite(warningStageRaw) && warningStageRaw > 0 ? warningStageRaw : undefined;

    const totalStagesRaw = Number.parseInt(String(req.body?.totalStages ?? ""), 10);
    const totalStages =
      Number.isFinite(totalStagesRaw) && totalStagesRaw > 0 ? totalStagesRaw : undefined;

    let warningType;
    if (req.body?.warningType === "final" || req.body?.warningType === "initial") {
      warningType = req.body.warningType;
    } else if (warningStage && totalStages && warningStage >= totalStages) {
      warningType = "final";
    } else {
      warningType = "initial";
    }

    const result = await runAfterhoursCheck(db.sequelize, {
      warningType,
      warningStage,
      totalStages,
    });
    return ok(res, result);
  } catch (err) {
    return fail(res, 500, "AFTERHOURS_CHECK_FAILED", err?.message || "Check failed");
  }
}

/**
 * GET /api/afterhours/settings
 * Load notification settings from DB.
 */
async function getSettings(req, res) {
  const [rows] = await db.sequelize.query(
    `SELECT key, value FROM afterhours_config WHERE key = ANY($1)`,
    { bind: [CONFIG_KEYS] }
  );

  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }

  return ok(res, { settings });
}

/**
 * PUT /api/afterhours/settings
 * Save notification settings to DB.
 */
async function saveSettings(req, res) {
  const { settings } = req.body || {};
  if (!settings || typeof settings !== "object") {
    return fail(res, 400, "INVALID_BODY", "Expected { settings: { key: value } }");
  }

  const saved = [];
  for (const [key, value] of Object.entries(settings)) {
    if (!CONFIG_KEYS.includes(key)) continue;
    await db.sequelize.query(
      `INSERT INTO afterhours_config (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      { bind: [key, String(value ?? "")] }
    );
    saved.push(key);
  }

  return ok(res, { saved });
}

/**
 * GET /api/afterhours/report
 * Top-N monthly ranking of after-hours violations.
 * Query params: month (YYYY-MM), branch, search, limit (default 20)
 */
async function getMonthlyReport(req, res) {
  const rawMonth = req.query.month || null;
  const branch = req.query.branch || null;
  const search = String(req.query.search || "").trim() || null;
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
  const reportMonth = resolveReportMonth(rawMonth);
  const allowedBranches = normalizeAllowedBranches(getRequestAllowedBranches(req));

  if (allowedBranches !== null && allowedBranches.length === 0) {
    return ok(res, {
      reportMonth,
      ranking: [],
      summary: {
        totalStores: 0,
        totalViolationDays: 0,
        reportWindowStart: null,
        reportWindowEndExclusive: null,
        generatedAt: null,
      },
      filters: {
        month: reportMonth.slice(0, 7),
        branch,
        search,
        limit,
        windowStart: null,
      },
    });
  }

  let rows = await loadMonthlyReportRows({
    reportMonth,
    branch,
    search,
    limit,
    allowedBranches,
  });

  if (rows.length === 0 && allowedBranches === null) {
    const regenerated = await ensureMonthlyReportExists(reportMonth);
    if (regenerated) {
      rows = await loadMonthlyReportRows({
        reportMonth,
        branch,
        search,
        limit,
        allowedBranches,
      });
    }
  }

  const ranking = rows.map((row, idx) => ({
    rank: idx + 1,
    ...row,
  }));

  const summaryRow = await loadMonthlyReportSummary({
    reportMonth,
    branch,
    search,
    allowedBranches,
  });

  return ok(res, {
    reportMonth,
    ranking,
    summary: {
      totalStores: summaryRow.total_stores || 0,
      totalViolationDays: summaryRow.total_violation_days || 0,
      reportWindowStart: summaryRow.report_window_start || null,
      reportWindowEndExclusive: summaryRow.report_window_end_exclusive || null,
      generatedAt: summaryRow.generated_at || null,
    },
    filters: {
      month: reportMonth.slice(0, 7),
      branch,
      search,
      limit,
      windowStart: summaryRow.report_window_start || null,
    },
  });
}

/**
 * GET /api/afterhours/report/export
 * Download Excel/WPS-friendly monthly report export.
 * Query params: month (YYYY-MM), branch, search
 */
async function exportMonthlyReport(req, res) {
  try {
    const rawMonth = req.query.month || null;
    const branch = req.query.branch || null;
    const search = String(req.query.search || "").trim() || null;
    const reportMonth = resolveReportMonth(rawMonth);
    const allowedBranches = normalizeAllowedBranches(getRequestAllowedBranches(req));
    const requestedWindowStart = parseMonthlyReportWindowStart(req.query.windowStart);
    if (req.query.windowStart && !requestedWindowStart) {
      return fail(res, 400, "INVALID_WINDOW_START", "Invalid windowStart format. Expected HH:mm");
    }

    if (allowedBranches !== null && requestedWindowStart) {
      return fail(res, 403, "FORBIDDEN", "Custom report generation requires all-branch scope");
    }

    if (requestedWindowStart) {
      await generateMonthlyReport(db.sequelize, {
        targetMonth: reportMonth.slice(0, 7),
        windowStart: requestedWindowStart,
      });
    }

    let rows = await loadMonthlyReportRows({ reportMonth, branch, search, allowedBranches });
    if (rows.length === 0 && !requestedWindowStart && allowedBranches === null) {
      const regenerated = await ensureMonthlyReportExists(reportMonth);
      if (regenerated) {
        rows = await loadMonthlyReportRows({ reportMonth, branch, search, allowedBranches });
      }
    }

    const ranking = rows.map((row, idx) => ({ rank: idx + 1, ...row }));
    const summaryRow = await resolveMonthlyReportWindowSummary(
      await loadMonthlyReportSummary({ reportMonth, branch, search, allowedBranches })
    );
    const fileName = buildMonthlyReportExportFileName(reportMonth);
    const buffer = await buildMonthlyReportExportBuffer({
      reportMonth,
      branch,
      search,
      summary: summaryRow,
      rows: ranking,
    });

    return ok(res, {
      fileName,
      contentType: MONTHLY_REPORT_EXPORT_MIME,
      contentBase64: buildMonthlyReportExportBase64(buffer),
    });
  } catch (err) {
    return fail(res, 500, "REPORT_EXPORT_FAILED", err?.message || "Report export failed");
  }
}

/**
 * GET /api/afterhours/report/months
 * List available report months.
 * Query params: limit (default 12)
 */
async function getReportMonths(req, res) {
  const limit = Math.min(36, Math.max(1, parseInt(req.query.limit || "12", 10)));
  const allowedBranches = normalizeAllowedBranches(getRequestAllowedBranches(req));

  if (allowedBranches !== null && allowedBranches.length === 0) {
    return ok(res, { months: [] });
  }

  const bind = [];
  let where = "";
  let limitParam = 1;

  if (allowedBranches !== null) {
    where = "WHERE branch_id::text = ANY($1::text[])";
    bind.push(allowedBranches);
    limitParam = 2;
  }

  bind.push(limit);

  const [rows] = await db.sequelize.query(
    `SELECT DISTINCT report_month,
            COUNT(*)::int AS store_count,
            COALESCE(SUM(violation_count), 0)::int AS total_violation_days,
            MAX(generated_at) AS generated_at
     FROM afterhours_monthly_report
     ${where}
     GROUP BY report_month
     ORDER BY report_month DESC
     LIMIT $${limitParam}`,
    { bind }
  );

  return ok(res, { months: rows });
}

/**
 * POST /api/afterhours/report/generate
 * Manually trigger monthly report generation (admin).
 * Body: { month: "YYYY-MM" } (optional, defaults to previous month)
 */
async function triggerReportGenerate(req, res) {
  try {
    const requestedMonth = String(req.body?.month || "").trim();
    const targetMonth = /^\d{4}-\d{2}$/.test(requestedMonth) ? requestedMonth : undefined;
    const requestedWindowStart = parseMonthlyReportWindowStart(req.body?.windowStart);
    if (req.body?.windowStart && !requestedWindowStart) {
      return fail(res, 400, "INVALID_WINDOW_START", "Invalid windowStart format. Expected HH:mm");
    }

    const options = {};
    if (targetMonth) options.targetMonth = targetMonth;
    if (requestedWindowStart) options.windowStart = requestedWindowStart;

    const result = await generateMonthlyReport(db.sequelize, options);
    return ok(res, result);
  } catch (err) {
    return fail(res, 500, "REPORT_GENERATE_FAILED", err?.message || "Report generation failed");
  }
}

module.exports = {
  listViolations,
  getSummary,
  getAvailableDates,
  triggerCheck,
  getSettings,
  saveSettings,
  getMonthlyReport,
  exportMonthlyReport,
  getReportMonths,
  triggerReportGenerate,
};
