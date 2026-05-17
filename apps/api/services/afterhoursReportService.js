/**
 * After-Hours Monthly Report Service
 *
 * Aggregates daily afterhours_pc_log data into a monthly summary
 * stored in afterhours_monthly_report table.
 * Designed to run on the 1st of each month for the previous month.
 */

const { toWibDate, toWibIso } = require("../utils/time");
const { loadAfterhoursRuntimeConfig } = require("./afterhoursService");

const MONTHLY_REPORT_VIOLATION_WINDOW_START = "23:15:00";
const MONTHLY_REPORT_VIOLATION_WINDOW_END_EXCLUSIVE = "01:00:00";

function parseScheduleValue(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Not JSON; fallback to CSV parsing.
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveViolationWindow() {
  return {
    afterhoursWindowStart: MONTHLY_REPORT_VIOLATION_WINDOW_START,
    afterhoursWindowEndExclusive: MONTHLY_REPORT_VIOLATION_WINDOW_END_EXCLUSIVE,
  };
}

function resolveConfiguredMonthlyWindowStart(runtimeConfig = {}) {
  const scheduleTimes = parseScheduleValue(runtimeConfig.warning_schedule_times);
  const firstScheduledTime = normalizeDailyTime(scheduleTimes[0]);
  if (firstScheduledTime) return firstScheduledTime;

  return null;
}

function normalizeDailyTime(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const seconds = Number.parseInt(match[3] || "0", 10);
  if (hours > 23 || minutes > 59 || seconds > 59) return null;

  return `${match[1]}:${match[2]}:${String(seconds).padStart(2, "0")}`;
}

function formatMonthlyReportWindowLabel(value) {
  const normalized = normalizeDailyTime(value);
  if (!normalized) return null;

  return normalized.slice(0, 5);
}

async function resolveMonthlyReportWindow(sequelize, options = {}) {
  const fallback = resolveViolationWindow();
  const explicitWindowStart = normalizeDailyTime(options.windowStart);
  const explicitWindowEndExclusive = normalizeDailyTime(options.windowEndExclusive);

  if (explicitWindowStart) {
    return {
      afterhoursWindowStart: explicitWindowStart,
      afterhoursWindowEndExclusive: explicitWindowEndExclusive || fallback.afterhoursWindowEndExclusive,
    };
  }

  const runtimeConfig = await loadAfterhoursRuntimeConfig(sequelize);
  const configuredWindowStart = resolveConfiguredMonthlyWindowStart(runtimeConfig);

  if (!configuredWindowStart) {
    throw new Error("Missing after-hours warning_schedule_times configuration");
  }

  return {
    afterhoursWindowStart: configuredWindowStart,
    afterhoursWindowEndExclusive:
      explicitWindowEndExclusive || fallback.afterhoursWindowEndExclusive,
  };
}

function resolveMonthlyReportDate(detectedAt, fallbackDate) {
  const wibDetectedAt = toWibIso(detectedAt);
  if (!wibDetectedAt) return fallbackDate || null;

  const [wibDate, timeWithZone = ""] = wibDetectedAt.split("T");
  const wibTime = timeWithZone.slice(0, 8);

  // The 00:00-00:59 final check belongs to the previous business day.
  if (wibTime < MONTHLY_REPORT_VIOLATION_WINDOW_END_EXCLUSIVE) {
    const previousDay = new Date(`${wibDate}T00:00:00+07:00`);
    previousDay.setUTCDate(previousDay.getUTCDate() - 1);
    return toWibDate(previousDay);
  }

  return wibDate;
}

/**
 * Get the first and last day of a target month.
 * @param {Date} [refDate] - Reference date. If on the 1st, reports previous month.
 * @returns {{ reportMonth: string, startDate: string, endDate: string }}
 */
function resolveReportRange(refDate) {
  const ref = refDate instanceof Date ? refDate : new Date();

  // Use WIB month boundaries so jobs running around 01:00 WIB on the 1st
  // still resolve to the previous local month instead of drifting by UTC.
  const wibDate = toWibDate(ref);
  if (wibDate && /^\d{4}-\d{2}-\d{2}$/.test(wibDate)) {
    const [refYearRaw, refMonthRaw] = wibDate.split("-");
    const refYear = Number.parseInt(refYearRaw, 10);
    const refMonth = Number.parseInt(refMonthRaw, 10); // 1-12

    const year = refMonth === 1 ? refYear - 1 : refYear;
    const month = refMonth === 1 ? 12 : refMonth - 1;

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0));

    function fmt(d) {
      return d.toISOString().slice(0, 10);
    }

    return {
      reportMonth: fmt(startDate),
      startDate: fmt(startDate),
      endDate: fmt(endDate),
    };
  }

  // Fallback to UTC only if WIB conversion unexpectedly fails.
  const refYear = ref.getUTCFullYear();
  const refMonth = ref.getUTCMonth(); // 0-indexed

  const year = refMonth === 0 ? refYear - 1 : refYear;
  const month = refMonth === 0 ? 11 : refMonth - 1; // 0-indexed

  const startDate = new Date(Date.UTC(year, month, 1));
  const endDate = new Date(Date.UTC(year, month + 1, 0));

  function fmt(d) {
    return d.toISOString().slice(0, 10);
  }

  return {
    reportMonth: fmt(startDate),
    startDate: fmt(startDate),
    endDate: fmt(endDate),
  };
}

/**
 * Generate monthly after-hours report by aggregating daily violations.
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @param {Object} [options]
 * @param {string} [options.targetMonth] - Override month in YYYY-MM format (e.g. "2026-02")
 * @param {Date} [options.refDate] - Reference date for automatic range calculation
 * @returns {Object} { reportMonth, totalStores, totalViolationDays, generated }
 */
async function generateMonthlyReport(sequelize, options = {}) {
  let reportMonth, startDate, endDate;
  const { afterhoursWindowStart, afterhoursWindowEndExclusive } = await resolveMonthlyReportWindow(
    sequelize,
    options
  );
  const reportWindowStart = formatMonthlyReportWindowLabel(afterhoursWindowStart);
  const reportWindowEndExclusive = formatMonthlyReportWindowLabel(afterhoursWindowEndExclusive);

  if (options.targetMonth) {
    // Manual override: parse YYYY-MM in UTC to avoid timezone date-shift.
    const monthMatch = String(options.targetMonth).match(/^(\d{4})-(\d{2})$/);
    if (!monthMatch) {
      throw new Error("Invalid targetMonth format. Expected YYYY-MM");
    }

    const y = Number.parseInt(monthMatch[1], 10);
    const m = Number.parseInt(monthMatch[2], 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
      throw new Error("Invalid targetMonth value");
    }

    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 0));
    const fmtUtc = (d) => d.toISOString().slice(0, 10);
    reportMonth = fmtUtc(start);
    startDate = fmtUtc(start);
    endDate = fmtUtc(end);
  } else {
    const range = resolveReportRange(options.refDate);
    reportMonth = range.reportMonth;
    startDate = range.startDate;
    endDate = range.endDate;
  }

  console.log(
    `[afterhours-report] Generating monthly report for ${reportMonth} (${startDate} to ${endDate})`
  );

  // Aggregate only entries inside after-hours WIB window to avoid daytime/manual-test noise.
  const [rows] = await sequelize.query(
    `SELECT
       l.store_code,
       l.store_name,
       COALESCE(ms.branch_id::text, l.branch_id) AS branch_id,
       COALESCE(mb.branch_name, l.branch_name) AS branch_name,
       l.check_date,
       l.detected_at
     FROM afterhours_pc_log l
     LEFT JOIN data_stores ms ON ms.store_code::text = l.store_code
     LEFT JOIN data_branches mb ON mb.branch_id = ms.branch_id
     WHERE l.check_date >= $1
       AND l.check_date <= ($2::date + INTERVAL '1 day')::date
       AND (
         (l.detected_at AT TIME ZONE 'Asia/Jakarta')::time >= $3::time
         OR (l.detected_at AT TIME ZONE 'Asia/Jakarta')::time < $4::time
       )
     ORDER BY l.store_code ASC, l.check_date ASC, l.detected_at ASC`,
    {
      bind: [startDate, endDate, afterhoursWindowStart, afterhoursWindowEndExclusive],
    }
  );

  const groupedRows = new Map();
  for (const row of rows) {
    const reportDate = resolveMonthlyReportDate(row.detected_at, row.check_date);
    if (!reportDate || reportDate < startDate || reportDate > endDate) continue;
    const detectedAtWib =
      toWibIso(row.detected_at) || (row.detected_at ? new Date(row.detected_at).toISOString() : null);

    const storeCode = row.store_code;
    if (!groupedRows.has(storeCode)) {
      groupedRows.set(storeCode, {
        store_code: storeCode,
        store_name: row.store_name || null,
        branch_id: row.branch_id ?? null,
        branch_name: row.branch_name || null,
        violation_dates: new Set(),
        violation_timestamps: [],
      });
    }

    const entry = groupedRows.get(storeCode);
    if (row.store_name) entry.store_name = row.store_name;
    if (row.branch_id != null) entry.branch_id = row.branch_id;
    if (row.branch_name) entry.branch_name = row.branch_name;
    entry.violation_dates.add(reportDate);
    if (detectedAtWib) entry.violation_timestamps.push(detectedAtWib);
  }

  const summarizedRows = Array.from(groupedRows.values())
    .map((row) => ({
      store_code: row.store_code,
      store_name: row.store_name,
      branch_id: row.branch_id,
      branch_name: row.branch_name,
      violation_count: row.violation_dates.size,
      violation_dates: Array.from(row.violation_dates).sort(),
      violation_timestamps: row.violation_timestamps,
      report_window_start: afterhoursWindowStart,
      report_window_end_exclusive: afterhoursWindowEndExclusive,
    }))
    .sort(
      (left, right) =>
        right.violation_count - left.violation_count ||
        String(left.store_name || "").localeCompare(String(right.store_name || "")) ||
        String(left.store_code || "").localeCompare(String(right.store_code || ""))
    );

  console.log(
    `[afterhours-report] Found ${summarizedRows.length} store(s) with violations in ${reportMonth}`
  );

  // Rebuild selected month so changed filtering logic is applied consistently.
  await sequelize.query(`DELETE FROM afterhours_monthly_report WHERE report_month = $1`, {
    bind: [reportMonth],
  });

  // Insert refreshed monthly rows
  let generated = 0;
  for (const row of summarizedRows) {
    await sequelize.query(
      `INSERT INTO afterhours_monthly_report
         (report_month, report_window_start, report_window_end_exclusive, store_code, store_name, branch_id, branch_name, violation_count, violation_dates, violation_timestamps, generated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, NOW())
       ON CONFLICT (report_month, store_code) DO UPDATE SET
         report_window_start = EXCLUDED.report_window_start,
         report_window_end_exclusive = EXCLUDED.report_window_end_exclusive,
         store_name = COALESCE(EXCLUDED.store_name, afterhours_monthly_report.store_name),
         branch_id = EXCLUDED.branch_id,
         branch_name = EXCLUDED.branch_name,
         violation_count = EXCLUDED.violation_count,
         violation_dates = EXCLUDED.violation_dates,
         violation_timestamps = EXCLUDED.violation_timestamps,
         generated_at = NOW()`,
      {
        bind: [
          reportMonth,
          reportWindowStart,
          reportWindowEndExclusive,
          row.store_code,
          row.store_name,
          row.branch_id,
          row.branch_name,
          row.violation_count,
          JSON.stringify(row.violation_dates),
          JSON.stringify(row.violation_timestamps || []),
        ],
      }
    );
    generated++;
  }

  console.log(
    `[afterhours-report] Upserted ${generated} row(s) into afterhours_monthly_report for ${reportMonth}`
  );

  return {
    reportMonth,
    reportWindowStart,
    reportWindowEndExclusive,
    totalStores: summarizedRows.length,
    totalViolationDays: summarizedRows.reduce((sum, r) => sum + r.violation_count, 0),
    generated,
  };
}

module.exports = {
  generateMonthlyReport,
  resolveReportRange,
  resolveViolationWindow,
  resolveMonthlyReportDate,
  resolveMonthlyReportWindow,
  resolveConfiguredMonthlyWindowStart,
};
