const { toWibDate, WIB_TZ } = require("../utils/time");
const { syncDataToDb } = require("./dataSyncService");
const { parseTimesCsv } = require("./dataPersist");
const { runScheduledBackup, cleanupOldBackups, cleanupOldLogs } = require("./backupService");
const { runAfterhoursCheck } = require("./afterhoursService");
const { generateMonthlyReport } = require("./afterhoursReportService");
const { loadAfterhoursRuntimeConfig, buildNotifyConfig } = require("./afterhoursService");
const { sendWhatsApp } = require("./notifyService");
const db = require("../models");
const { upsertServiceHeartbeat } = require("../utils/serviceHeartbeats");

function isExplicitFalse(value) {
  if (value == null) return false;
  const v = String(value).trim().toLowerCase();
  return v === "0" || v === "false" || v === "no" || v === "off";
}

function isEnabled(value, defaultValue = true) {
  if (value == null) return defaultValue;
  return !isExplicitFalse(value);
}

function getWibNowParts() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: WIB_TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const map = {};
  for (const p of parts) map[p.type] = p.value;

  const hour = Number.parseInt(map.hour || "0", 10);
  const minute = Number.parseInt(map.minute || "0", 10);
  const second = Number.parseInt(map.second || "0", 10);
  const date = `${map.year}-${map.month}-${map.day}`;
  const pad2 = (n) => String(n).padStart(2, "0");
  const normalizedHour = hour === 24 ? 0 : hour;

  const day = Number.parseInt(map.day || "1", 10);

  return {
    date,
    day: Number.isFinite(day) ? day : 1,
    hour: Number.isFinite(normalizedHour) ? normalizedHour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
    second: Number.isFinite(second) ? second : 0,
    hhmm: `${pad2(Number.isFinite(normalizedHour) ? normalizedHour : 0)}:${pad2(Number.isFinite(minute) ? minute : 0)}`,
  };
}

function isWithinEodWindowNow() {
  const { hour, minute } = getWibNowParts();
  return hour > 19 || (hour === 19 && minute >= 30);
}

function shouldRunFinalSyncNow(finalTimes) {
  const { hhmm } = getWibNowParts();
  return finalTimes.includes(hhmm);
}

function parseDailyTime(value, fallback = "00:10") {
  const raw = value == null ? "" : String(value).trim();
  if (!raw) return fallback;
  if (!/^\d{2}:\d{2}$/.test(raw)) return fallback;
  return raw;
}

function parsePollMs(value, fallback = 120000) {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n < 15_000) return fallback;
  return n;
}

function parseAfterhoursScheduleValue(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Not a JSON array; fallback to CSV parsing.
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

let started = false;
let eodInFlight = false;
let employeesInFlight = false;
let syncInFlight = false;
let afterhoursInFlight = false;
let afterhoursReportInFlight = false;
let afterhoursReportSendInFlight = false;

const lastRunByKey = new Map();

function alreadyRanToday(key) {
  const today = toWibDate();
  return lastRunByKey.get(key) === today;
}

function markRanToday(key) {
  lastRunByKey.set(key, toWibDate());
}

function alreadyRanAtMinute(key) {
  const { date, hhmm } = getWibNowParts();
  const stamp = `${date} ${hhmm}`;
  return lastRunByKey.get(key) === stamp;
}

function markRanAtMinute(key) {
  const { date, hhmm } = getWibNowParts();
  lastRunByKey.set(key, `${date} ${hhmm}`);
}

async function runEodSync(reason) {
  if (eodInFlight) return;
  eodInFlight = true;
  try {
    // Update scheduler heartbeat on each sync
    await upsertServiceHeartbeat(db.sequelize, "scheduler").catch(() => {});
    const res = await syncDataToDb({ includeEmployees: false, reason });
    console.log(
      `[dataScheduler] EOD sync ok (${reason}) @ ${res.finishedAt} rows=${res.fetched.eodRows}`
    );
  } catch (e) {
    console.warn("[dataScheduler] EOD sync failed:", e?.message || e);
  } finally {
    eodInFlight = false;
  }
}

async function runEmployeeSync(reason) {
  if (employeesInFlight) return;
  employeesInFlight = true;
  try {
    const res = await syncDataToDb({ includeEmployees: true, reason });
    console.log(
      `[dataScheduler] Employee sync ok (${reason}) @ ${res.finishedAt} employees=${res.fetched.employeeRows}`
    );

    // Only consider the daily sync "done" if we actually got some data.
    if (reason === "employees_daily" && (res.fetched.employeeRows || 0) > 0) {
      markRanToday("employees_daily");
    }
  } catch (e) {
    console.warn("[dataScheduler] Employee sync failed:", e?.message || e);
  } finally {
    employeesInFlight = false;
  }
}

async function runSyncPoll() {
  if (syncInFlight) return;
  syncInFlight = true;
  try {
    const { pollAndPersistSync } = require("../controllers/syncController");
    const res = await pollAndPersistSync();
    console.log(
      `[dataScheduler] Sync poll ok stores=${res.persisted} stale=${res.stale} deleted=${res.deleted}`
    );
  } catch (e) {
    console.warn("[dataScheduler] Sync poll failed:", e?.message || e);
  } finally {
    syncInFlight = false;
  }
}

async function runAfterhoursCheckJob(options = {}) {
  const warningType = options.warningType === "final" ? "final" : "initial";
  const warningStageRaw = Number.parseInt(String(options.warningStage ?? "1"), 10);
  const warningStage =
    Number.isFinite(warningStageRaw) && warningStageRaw > 0 ? warningStageRaw : 1;
  const totalStagesRaw = Number.parseInt(String(options.totalStages ?? String(warningStage)), 10);
  const totalStages =
    Number.isFinite(totalStagesRaw) && totalStagesRaw >= warningStage
      ? totalStagesRaw
      : warningStage;

  if (afterhoursInFlight) return;
  afterhoursInFlight = true;
  try {
    const result = await runAfterhoursCheck(db.sequelize, {
      warningType,
      warningStage,
      totalStages,
      scheduledTime: options.scheduledTime,
    });
    console.log(
      `[dataScheduler] After-hours check ok type=${warningType} stage=${warningStage}/${totalStages} date=${result.checkDate} violations=${result.totalViolations}`
    );
  } catch (e) {
    console.warn(
      `[dataScheduler] After-hours check failed (${warningType} stage=${warningStage}/${totalStages}):`,
      e?.message || e
    );
  } finally {
    afterhoursInFlight = false;
  }
}

async function runAfterhoursMonthlyReportJob(options = {}) {
  if (afterhoursReportInFlight) return;
  afterhoursReportInFlight = true;
  try {
    const targetMonthRaw = String(options.targetMonth || "").trim();
    const targetMonth = /^\d{4}-\d{2}$/.test(targetMonthRaw) ? targetMonthRaw : undefined;
    const result = await generateMonthlyReport(db.sequelize, {
      targetMonth,
    });
    const reason = String(options.reason || "scheduled");
    console.log(
      `[dataScheduler] After-hours report generated reason=${reason} month=${result.reportMonth} stores=${result.totalStores} violations=${result.totalViolationDays}`
    );
  } catch (e) {
    console.warn("[dataScheduler] After-hours report failed:", e?.message || e);
  } finally {
    afterhoursReportInFlight = false;
  }
}

function parseMonthlyReportWhatsappTargets(value) {
  return Array.from(
    new Set(
      String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function formatMonthlyReportMonthLabel(reportMonth) {
  const normalized = String(reportMonth || "").slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(normalized)) return normalized || "-";

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

function formatMonthlyReportDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  try {
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: WIB_TZ,
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return date.toISOString().replace("T", " ").slice(0, 16);
  }
}

async function loadMonthlyReportRows(sequelize, reportMonth, limit = 10) {
  const [rows] = await sequelize.query(
    `SELECT store_code, store_name, branch_id, branch_name, violation_count
     FROM afterhours_monthly_report
     WHERE report_month = $1
     ORDER BY violation_count DESC, store_name ASC, store_code ASC
     LIMIT $2`,
    { bind: [reportMonth, limit] }
  );

  return rows;
}

function buildMonthlyReportWhatsAppMessage({ reportMonth, totalStores, totalViolationDays, rows }) {
  const lines = [
    "LAPORAN BULANAN AFTER-HOURS",
    `Periode: ${formatMonthlyReportMonthLabel(reportMonth)}`,
    `Dikirim: ${formatMonthlyReportDateTime(new Date())}`,
    `Total toko pelanggar: ${Number(totalStores || 0)}`,
    `Total violation day: ${Number(totalViolationDays || 0)}`,
    "",
    "Top pelanggaran:",
  ];

  if (!Array.isArray(rows) || rows.length === 0) {
    lines.push("- Tidak ada pelanggaran pada periode ini.");
  } else {
    rows.forEach((row, index) => {
      const rank = index + 1;
      const storeName = String(row.store_name || "-").trim() || "-";
      const branchName = String(row.branch_name || row.branch_id || "-").trim() || "-";
      const violationCount = Number(row.violation_count || 0);
      lines.push(
        `${rank}. ${row.store_code} - ${storeName} (${branchName}) | ${violationCount} hari`
      );
    });
  }

  lines.push("", "Detail lengkap tersedia di dashboard monthly report.");
  return lines.join("\n");
}

async function runAfterhoursMonthlyReportSendJob(options = {}) {
  if (afterhoursReportSendInFlight) return;
  afterhoursReportSendInFlight = true;
  try {
    const runtimeConfig = await loadAfterhoursRuntimeConfig(db.sequelize);
    const targets = parseMonthlyReportWhatsappTargets(
      runtimeConfig.monthly_report_whatsapp_targets
    );

    if (
      String(runtimeConfig.notify_enabled || "")
        .trim()
        .toLowerCase() === "false" ||
      targets.length === 0
    ) {
      console.log(
        "[dataScheduler] Monthly report WhatsApp send skipped (missing target or disabled)"
      );
      return;
    }

    const reportResult = await generateMonthlyReport(db.sequelize);
    const reportMonth = reportResult.reportMonth;
    const rows = await loadMonthlyReportRows(db.sequelize, reportMonth, 10);
    const message = buildMonthlyReportWhatsAppMessage({
      reportMonth,
      totalStores: reportResult.totalStores,
      totalViolationDays: reportResult.totalViolationDays,
      rows,
    });
    const notifyConfig = buildNotifyConfig(runtimeConfig);

    const deliveryResults = [];
    for (const target of targets) {
      const delivery = await sendWhatsApp(target, message, notifyConfig);
      deliveryResults.push({ target, ok: Boolean(delivery?.ok) });
    }

    const successCount = deliveryResults.filter((item) => item.ok).length;
    const reason = String(options.reason || "scheduled");
    console.log(
      `[dataScheduler] Monthly report WhatsApp send ok reason=${reason} month=${reportMonth} targetCount=${targets.length} successCount=${successCount}`
    );
  } catch (e) {
    console.warn("[dataScheduler] Monthly report WhatsApp send failed:", e?.message || e);
  } finally {
    afterhoursReportSendInFlight = false;
  }
}

function startDataScheduler() {
  if (started) return;
  started = true;

  const enabled = isEnabled(process.env.DATA_SCHEDULER_ENABLED, true);
  if (!enabled) {
    console.log("[dataScheduler] Disabled (DATA_SCHEDULER_ENABLED=false)");
    return;
  }

  // EOD sync intervals
  const pollMsEodWindow = parsePollMs(process.env.DATA_EOD_POLL_MS, 15 * 60 * 1000); // 15 min during EOD window
  const pollMsRegular = parsePollMs(process.env.DATA_REGULAR_POLL_MS, 60 * 60 * 1000); // 1 hour outside EOD window
  const employeeDaily = parseDailyTime(process.env.DATA_EMPLOYEE_DAILY_SYNC_HHMM, "00:10");
  const finalTimes = parseTimesCsv(process.env.DATA_EOD_FINAL_SYNC_TIMES, ["23:55", "23:58"]);

  // Backup configuration
  const backupDaily = parseDailyTime(process.env.BACKUP_DAILY_HHMM, "00:05");
  const backupRetentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || "7", 10);
  const afterhoursReportDaily = parseDailyTime(process.env.AFTERHOURS_REPORT_DAILY_HHMM, "00:20");
  const afterhoursMonthlyReportSendTime = "09:00";
  const afterhoursSchedule = {
    times: [],
  };
  let afterhoursScheduleRefreshInFlight = false;
  let afterhoursScheduleMissingLogged = false;

  async function refreshAfterhoursScheduleFromDb() {
    if (afterhoursScheduleRefreshInFlight) return;
    afterhoursScheduleRefreshInFlight = true;
    try {
      const [rows] = await db.sequelize.query(
        `SELECT key, value FROM afterhours_config WHERE key = ANY($1)`,
        { bind: [["warning_schedule_times"]] }
      );
      const configMap = {};
      for (const row of rows) configMap[row.key] = row.value;

      const seenTimes = new Set();
      const nextTimes = [];
      for (const rawTime of parseAfterhoursScheduleValue(configMap.warning_schedule_times)) {
        const parsedTime = parseDailyTime(rawTime, "");
        if (!parsedTime || seenTimes.has(parsedTime)) continue;
        seenTimes.add(parsedTime);
        nextTimes.push(parsedTime);
      }

      if (nextTimes.length === 0) {
        afterhoursSchedule.times = [];
        if (!afterhoursScheduleMissingLogged) {
          afterhoursScheduleMissingLogged = true;
          console.warn(
            "[dataScheduler] After-hours schedule missing warning_schedule_times; warnings disabled"
          );
        }
        return;
      }

      afterhoursScheduleMissingLogged = false;

      const changed = nextTimes.join(",") !== afterhoursSchedule.times.join(",");
      afterhoursSchedule.times = nextTimes;

      if (changed) {
        console.log(
          `[dataScheduler] After-hours schedule updated times=${afterhoursSchedule.times.join(",")}`
        );
      }
    } catch (err) {
      console.warn(
        "[dataScheduler] Failed to refresh after-hours schedule from DB:",
        err?.message || err
      );
    } finally {
      afterhoursScheduleRefreshInFlight = false;
    }
  }

  console.log(
    `[dataScheduler] Enabled tz=${WIB_TZ} regularPoll=${pollMsRegular / 60000}min eodPoll=${pollMsEodWindow / 60000}min employeeDaily=${employeeDaily} finalTimes=${finalTimes.join(
      ","
    )} backupDaily=${backupDaily} retention=${backupRetentionDays}d afterhoursSchedule=dynamic afterhoursReportDaily=${afterhoursReportDaily}`
  );

  refreshAfterhoursScheduleFromDb().catch(() => {});
  setInterval(() => {
    refreshAfterhoursScheduleFromDb();
  }, 5 * 60_000);

  // Track last sync time for adaptive polling
  let lastEodSyncTime = 0;

  // Unified EOD polling with adaptive interval
  setInterval(() => {
    const now = Date.now();
    const isEodWindow = isWithinEodWindowNow();
    const interval = isEodWindow ? pollMsEodWindow : pollMsRegular;

    // Check if enough time has passed since last sync
    if (now - lastEodSyncTime >= interval) {
      lastEodSyncTime = now;
      const reason = isEodWindow ? "eod_window_poll" : "regular_hourly_poll";
      runEodSync(reason);
    }
  }, 60_000); // Check every minute, but only sync based on interval

  // Minute-tick for final sync + employee daily + backup.
  setInterval(() => {
    const now = getWibNowParts();

    if (shouldRunFinalSyncNow(finalTimes) && !alreadyRanAtMinute("eod_final")) {
      markRanAtMinute("eod_final");
      runEodSync("eod_final");
    }

    if (now.hhmm === employeeDaily && !alreadyRanToday("employees_daily")) {
      runEmployeeSync("employees_daily");
    }

    // Daily backup at configured time (default 00:05)
    if (now.hhmm === backupDaily && !alreadyRanToday("backup_daily")) {
      markRanToday("backup_daily");
      (async () => {
        try {
          console.log(`[dataScheduler] Starting daily backup...`);
          await runScheduledBackup();
          await cleanupOldBackups(backupRetentionDays);
          await cleanupOldLogs(backupRetentionDays);
          console.log(`[dataScheduler] Daily backup and cleanup completed successfully`);
        } catch (err) {
          console.error(`[dataScheduler] Daily backup failed:`, err.message);
        }
      })();
    }

    // After-hours warnings at configured stages (default 4x: 23:15, 23:30, 23:45, 00:00 WIB)
    const stageIndex = afterhoursSchedule.times.indexOf(now.hhmm);
    if (stageIndex !== -1) {
      const warningStage = stageIndex + 1;
      const totalStages = afterhoursSchedule.times.length;
      const warningType = warningStage === totalStages ? "final" : "initial";
      const stageKey = `afterhours_warning_stage_${warningStage}`;

      if (!alreadyRanToday(stageKey)) {
        markRanToday(stageKey);
        runAfterhoursCheckJob({
          warningType,
          warningStage,
          totalStages,
          scheduledTime: now.hhmm,
        });
      }
    }

    // Daily month-to-date report refresh at configured time (default 00:20 WIB)
    if (now.hhmm === afterhoursReportDaily && !alreadyRanToday("afterhours_monthly_report_daily")) {
      markRanToday("afterhours_monthly_report_daily");
      runAfterhoursMonthlyReportJob({
        reason: "daily_mtd",
        targetMonth: String(now.date || "").slice(0, 7),
      });
    }

    // Monthly close report on 1st of each month at 01:00 WIB (previous month).
    // Use >= so the job can catch up if the scheduler missed the exact minute.
    if (now.day === 1 && now.hhmm >= "01:00" && !alreadyRanToday("afterhours_monthly_report")) {
      markRanToday("afterhours_monthly_report");
      runAfterhoursMonthlyReportJob({ reason: "monthly_close" });
    }

    // Monthly report WhatsApp broadcast on 1st at 09:00 WIB.
    if (
      now.day === 1 &&
      now.hhmm >= afterhoursMonthlyReportSendTime &&
      !alreadyRanToday("afterhours_monthly_report_send")
    ) {
      markRanToday("afterhours_monthly_report_send");
      runAfterhoursMonthlyReportSendJob({ reason: "monthly_send_0900" });
    }
  }, 60_000);

  // Periodic employee refresh as a backstop (in case the daily run fails).
  const employeeRefreshMs = parsePollMs(process.env.DATA_EMPLOYEE_REFRESH_MS, 6 * 60 * 60 * 1000);
  setInterval(() => {
    if (alreadyRanAtMinute("employees_periodic")) return;
    markRanAtMinute("employees_periodic");
    runEmployeeSync("employees_periodic");
  }, employeeRefreshMs);

  // Store sync polling (every 60s for backtrace history).
  const syncPollEnabled = isEnabled(process.env.DATA_SYNC_POLL_ENABLED, true);
  const syncPollMs = parsePollMs(process.env.DATA_SYNC_POLL_MS, 60_000);
  if (syncPollEnabled) {
    console.log(`[dataScheduler] Sync poll enabled interval=${syncPollMs}ms`);
    setInterval(() => runSyncPoll(), syncPollMs);
  }

  // Do one quick warm-up shortly after boot.
  setTimeout(() => {
    runEodSync("startup_warmup");
    runEmployeeSync("startup_warmup");
    if (syncPollEnabled) runSyncPoll();
    runAfterhoursMonthlyReportJob({
      reason: "startup_mtd",
      targetMonth: String(toWibDate() || "").slice(0, 7),
    });
  }, 10_000);
}

module.exports = {
  startDataScheduler,
};
