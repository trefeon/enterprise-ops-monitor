const os = require("os");
const fs = require("fs");
const db = require("../models");
const { SystemLog } = require("../models");
const ExcelJS = require("exceljs");
const { ok, fail } = require("../utils/response");
const { getPagination, buildPaginationMeta } = require("../utils/pagination");
const { toWibDate, toWibIso } = require("../utils/time");
const {
  upsertServiceHeartbeat,
  getServiceHeartbeat,
  heartbeatStatus,
} = require("../utils/serviceHeartbeats");
const { BRANCHES } = require("../services/dataClient");
const { Op } = db.Sequelize;

const LOG_LEVELS = ["INFO", "WARNING", "ERROR", "CRITICAL"];
const SYSTEM_LOG_EXPORT_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function normalizeLogLevel(value) {
  const raw = String(value ?? "")
    .trim()
    .toUpperCase();
  if (!raw) return null;
  return LOG_LEVELS.includes(raw) ? raw : null;
}

function buildLogWhereFilters({ level, q }) {
  const where = {};
  const levelFilter = normalizeLogLevel(level);
  const search = String(q ?? "").trim();

  if (levelFilter) {
    where.level = levelFilter;
  }

  if (search) {
    where[Op.or] = [
      { component: { [Op.iLike]: `%${search}%` } },
      { message: { [Op.iLike]: `%${search}%` } },
      { level: { [Op.iLike]: `%${search}%` } },
    ];
  }

  return where;
}

function toSystemLogRow(log) {
  return {
    id: log.id,
    level: log.level,
    component: log.component,
    message: log.message,
    metadata: log.metadata,
    createdAt: toWibIso(log.createdAt),
  };
}

const excel = require("../utils/excel");

function formatLogTimestamp(value) {
  const raw = String(value ?? "").trim();
  return raw ? raw.replace("T", " ").replace("+07:00", " WIB") : "—";
}

function formatLogMetadata(value) {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function buildSystemLogWorkbook({ generatedAt, levelLabel, searchLabel, logs, truncated }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Enterprise Ops Monitor";
  workbook.lastModifiedBy = "Enterprise Ops Monitor";
  workbook.created = new Date();
  workbook.modified = new Date();

  const summarySheet = workbook.addWorksheet("Summary", {
    properties: { defaultRowHeight: 20 },
    views: [{ state: "frozen", ySplit: 3 }],
  });
  summarySheet.columns = [{ width: 24 }, { width: 42 }, { width: 24 }, { width: 42 }];

  summarySheet.mergeCells("A1:D1");
  summarySheet.getCell("A1").value = "System Logs Report";
  excel.styleTitleCell(summarySheet.getCell("A1"));
  summarySheet.getRow(1).height = 26;

  summarySheet.mergeCells("A2:D2");
  summarySheet.getCell("A2").value = `Level: ${levelLabel} | Search: ${searchLabel}`;
  excel.styleSubtitleCell(summarySheet.getCell("A2"));
  summarySheet.getRow(2).height = 24;

  summarySheet.mergeCells("A3:D3");
  summarySheet.getCell("A3").value = `Generated at ${generatedAt} | Export format: XLSX`;
  excel.styleSubtitleCell(summarySheet.getCell("A3"));
  summarySheet.getRow(3).height = 22;

  const summaryPairs = [
    ["Report Date", toWibDate(), "Generated At", generatedAt],
    ["Level Filter", levelLabel, "Search Filter", searchLabel],
    ["Exported Rows", Number(logs.length || 0), "Truncated", truncated ? "Yes" : "No"],
    ["Timezone", "Asia/Jakarta", "Workbook Sheets", 2],
  ];

  summaryPairs.forEach((pair, idx) => {
    const rowNumber = idx + 4;
    summarySheet.getCell(`A${rowNumber}`).value = pair[0];
    summarySheet.getCell(`B${rowNumber}`).value = pair[1];
    summarySheet.getCell(`C${rowNumber}`).value = pair[2];
    summarySheet.getCell(`D${rowNumber}`).value = pair[3];
    excel.styleSummaryLabel(summarySheet.getCell(`A${rowNumber}`));
    excel.styleSummaryValue(summarySheet.getCell(`B${rowNumber}`));
    excel.styleSummaryLabel(summarySheet.getCell(`C${rowNumber}`));
    excel.styleSummaryValue(summarySheet.getCell(`D${rowNumber}`));
    summarySheet.getRow(rowNumber).height = 22;
  });

  const logsSheet = workbook.addWorksheet("Logs", {
    properties: { defaultRowHeight: 20 },
    views: [{ state: "frozen", ySplit: 4, activeCell: "A5" }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  logsSheet.columns = [
    { width: 8 },
    { width: 24 },
    { width: 12 },
    { width: 22 },
    { width: 72 },
    { width: 44 },
  ];

  logsSheet.mergeCells("A1:F1");
  logsSheet.getCell("A1").value = "System Logs";
  excel.styleTitleCell(logsSheet.getCell("A1"));
  logsSheet.getRow(1).height = 26;

  logsSheet.mergeCells("A2:F2");
  logsSheet.getCell("A2").value = `Level: ${levelLabel} | Search: ${searchLabel}`;
  excel.styleSubtitleCell(logsSheet.getCell("A2"));
  logsSheet.getRow(2).height = 22;

  logsSheet.mergeCells("A3:F3");
  logsSheet.getCell("A3").value =
    "Columns: Rank, Timestamp (WIB), Level, Source, Message, Metadata.";
  excel.styleSubtitleCell(logsSheet.getCell("A3"));
  logsSheet.getRow(3).height = 24;

  const headers = ["Rank", "Timestamp", "Level", "Source", "Message", "Metadata"];
  const headerRow = logsSheet.getRow(4);
  headerRow.values = headers;
  headerRow.height = 22;
  headerRow.eachCell((cell) => excel.styleTableHeader(cell));
  logsSheet.autoFilter = "A4:F4";

  if (logs.length === 0) {
    logsSheet.mergeCells("A5:F5");
    const emptyCell = logsSheet.getCell("A5");
    emptyCell.value = "No log data for this filter.";
    emptyCell.alignment = { horizontal: "center", vertical: "middle" };
    emptyCell.font = { name: "Arial", italic: true, color: { argb: "64748B" } };
    emptyCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
    excel.setThinBorder(emptyCell);
    logsSheet.getRow(5).height = 24;
    return workbook;
  }

  logs.forEach((log, index) => {
    const row = logsSheet.addRow([
      index + 1,
      formatLogTimestamp(log.createdAt),
      log.level || "—",
      log.component || "—",
      log.message || "—",
      formatLogMetadata(log.metadata),
    ]);

    const isAlt = index % 2 === 1;
    row.height = 22;
    row.eachCell((cell, colNumber) => {
      const center = colNumber === 1 || colNumber === 3;
      const wrap = colNumber >= 4;
      excel.styleTableCell(cell, { center, wrap, alt: isAlt });
    });
  });

  return workbook;
}

function buildSystemLogExportBase64(buffer) {
  return Buffer.isBuffer(buffer)
    ? buffer.toString("base64")
    : Buffer.from(buffer).toString("base64");
}

// ─── CPU Monitoring ──────────────────────────────────────────────────────────
let currentCpuUsagePercent = 0;
let lastCpuStats = null;
let cpuMonitorTimer = null;

function getCpuTickTotals() {
  const cpus = os.cpus();
  let user = 0,
    nice = 0,
    sys = 0,
    idle = 0,
    irq = 0;
  for (const cpu of cpus) {
    user += cpu.times.user;
    nice += cpu.times.nice;
    sys += cpu.times.sys;
    idle += cpu.times.idle;
    irq += cpu.times.irq;
  }
  return { idle, total: user + nice + sys + idle + irq };
}

function startCpuMonitor() {
  if (cpuMonitorTimer) return;
  lastCpuStats = getCpuTickTotals();
  cpuMonitorTimer = setInterval(() => {
    const currentStats = getCpuTickTotals();
    const idleDiff = currentStats.idle - lastCpuStats.idle;
    const totalDiff = currentStats.total - lastCpuStats.total;
    if (totalDiff > 0) {
      // Calculate percentage (0-100)
      currentCpuUsagePercent = (1 - idleDiff / totalDiff) * 100;
    }
    lastCpuStats = currentStats;
  }, 2000); // Update every 2 seconds
  // Do not keep process alive just for periodic stats updates (important for tests/CLI scripts).
  if (typeof cpuMonitorTimer.unref === "function") {
    cpuMonitorTimer.unref();
  }
}

// Start monitoring immediately
startCpuMonitor();

function getDiskStats(pathname) {
  try {
    const stats = fs.statfsSync(pathname);
    const total = stats.bsize * stats.blocks;
    const free = stats.bsize * stats.bavail;
    const used = total - free;
    return {
      totalBytes: total,
      freeBytes: free,
      usedBytes: used,
      usedPercent: total > 0 ? (used / total) * 100 : 0,
    };
  } catch (err) {
    console.error(`[systemController] getDiskStats error:`, err);
    return null;
  }
}

function formatServiceStatus(name, status) {
  return { name, status, lastCheckedAt: toWibIso(new Date()), lastSeenAt: null };
}

function formatServiceStatusWithTimes(name, status, lastSeenAt) {
  const checkedAt = new Date();
  const seenAt = lastSeenAt ? new Date(lastSeenAt) : null;
  return {
    name,
    status,
    lastCheckedAt: toWibIso(checkedAt),
    lastSeenAt: seenAt && !Number.isNaN(seenAt.getTime()) ? toWibIso(seenAt) : null,
  };
}

async function checkDatabase() {
  try {
    await db.sequelize.authenticate();
    return "ONLINE";
  } catch (err) {
    console.error(`[systemController] checkDatabase error:`, err);
    return "DEGRADED";
  }
}

async function checkServiceFromHeartbeat(serviceName, maxAgeSeconds) {
  const lastSeenAt = await getServiceHeartbeat(db.sequelize, serviceName);
  const result = heartbeatStatus(lastSeenAt, maxAgeSeconds);
  return { status: result.status, lastSeenAt: result.lastSeenAt };
}

function getBackupDir() {
  return process.env.BACKUP_DIR || "/backups";
}

function getLatestBackupMtime(dir) {
  try {
    if (!fs.existsSync(dir)) return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let latest = null;
    for (const e of entries) {
      if (!e.isFile()) continue;
      if (!e.name.endsWith(".sql") && !e.name.endsWith(".dump")) continue;
      const full = `${dir.replace(/\/+$/, "")}/${e.name}`;
      const st = fs.statSync(full);
      const mtime = st?.mtime ? new Date(st.mtime) : null;
      if (!mtime || Number.isNaN(mtime.getTime())) continue;
      if (!latest || mtime > latest) latest = mtime;
    }
    return latest;
  } catch (err) {
    console.error(`[systemController] getLatestBackupMtime error:`, err);
    return null;
  }
}

async function checkBackupService(maxAgeSeconds) {
  const fromHeartbeat = await checkServiceFromHeartbeat("backup", maxAgeSeconds);
  if (fromHeartbeat.status !== "UNKNOWN") return fromHeartbeat;

  const latest = getLatestBackupMtime(getBackupDir());
  const result = heartbeatStatus(latest, maxAgeSeconds);

  // If we can infer a backup timestamp, seed the heartbeat table for consistency.
  if (latest) {
    await upsertServiceHeartbeat(db.sequelize, "backup");
  }

  return { status: result.status, lastSeenAt: latest };
}

exports.getSystemOverview = async (req, res, next) => {
  try {
    const disk = getDiskStats(process.env.BACKUP_DIR || "/");
    const overview = {
      hostname: os.hostname(),
      platform: `${os.platform()} ${os.arch()}`,
      uptimeSeconds: os.uptime(),
      loadavg: os.loadavg(),
      cpuUsage: currentCpuUsagePercent,
      cpuCount: os.cpus().length,
      memory: {
        totalBytes: os.totalmem(),
        freeBytes: os.freemem(),
      },
      disk,
      timezone: "Asia/Jakarta",
      generatedAt: toWibIso(new Date()),
    };

    return ok(res, overview, { timezone: "Asia/Jakarta" });
  } catch (err) {
    next(err);
  }
};

exports.getSystemHealth = async (req, res, next) => {
  return exports.getSystemOverview(req, res, next);
};

exports.getSystemBranches = async (req, res, next) => {
  try {
    return ok(res, BRANCHES);
  } catch (err) {
    next(err);
  }
};

exports.getSystemServices = async (req, res, next) => {
  try {
    // Record API liveness whenever this endpoint is hit.
    await upsertServiceHeartbeat(db.sequelize, "api");

    const databaseStatus = await checkDatabase();
    const api = await checkServiceFromHeartbeat("api", 180);
    const scheduler = await checkServiceFromHeartbeat("scheduler", 2 * 60 * 60); // 2 hours - scheduler syncs hourly outside EOD
    // Backups are daily; give a longer window before degrading.
    const backup = await checkBackupService(36 * 60 * 60);
    const services = [
      formatServiceStatus("Database", databaseStatus),
      formatServiceStatusWithTimes("API", api.status, api.lastSeenAt),
      formatServiceStatusWithTimes("Scheduler", scheduler.status, scheduler.lastSeenAt),
      formatServiceStatusWithTimes("Backup Service", backup.status, backup.lastSeenAt),
    ];

    return ok(res, services, { timezone: "Asia/Jakarta" });
  } catch (err) {
    next(err);
  }
};

exports.getSystemLogs = async (req, res, next) => {
  try {
    const where = buildLogWhereFilters(req.query);
    const { page, pageSize, offset, limit } = getPagination(req.query, {
      page: 1,
      pageSize: 50,
      maxPageSize: 200,
    });
    const total = await SystemLog.count({ where });
    const logs = await SystemLog.findAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    const data = logs.map((l) => toSystemLogRow(l));

    return ok(res, data, {
      ...buildPaginationMeta({ page, pageSize, total }),
      timezone: "Asia/Jakarta",
    });
  } catch (err) {
    next(err);
  }
};

exports.exportSystemLogs = async (req, res, next) => {
  try {
    const where = buildLogWhereFilters(req.query);
    const levelLabel = normalizeLogLevel(req.query?.level) || "ALL";
    const searchLabel = String(req.query?.q || "").trim() || "All";
    const limitRaw = Number(req.query?.limit);
    const exportLimit = Number.isFinite(limitRaw)
      ? Math.min(10000, Math.max(1, Math.floor(limitRaw)))
      : 5000;

    const logs = await SystemLog.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: exportLimit,
    });

    const data = logs.map((row) => toSystemLogRow(row));
    const truncated = data.length >= exportLimit;
    const workbook = buildSystemLogWorkbook({
      generatedAt: excel.formatExportDateTime(new Date()),
      levelLabel,
      searchLabel,
      logs: data,
      truncated,
    });
    const buffer = await workbook.xlsx.writeBuffer();

    return ok(
      res,
      {
        fileName: `system_logs_${toWibDate()}.xlsx`,
        contentType: SYSTEM_LOG_EXPORT_MIME,
        contentBase64: buildSystemLogExportBase64(buffer),
      },
      {
        timezone: "Asia/Jakarta",
        exported: data.length,
        limit: exportLimit,
        truncated,
      }
    );
  } catch (err) {
    next(err);
  }
};

exports.runHealthcheck = async (req, res, next) => {
  try {
    await upsertServiceHeartbeat(db.sequelize, "api");

    const database = await checkDatabase();
    const api = await checkServiceFromHeartbeat("api", 180);
    const scheduler = await checkServiceFromHeartbeat("scheduler", 2 * 60 * 60);
    const backup = await checkBackupService(36 * 60 * 60);
    const result = {
      database,
      api: api.status,
      scheduler: scheduler.status,
      backup: backup.status,
      checkedAt: toWibIso(new Date()),
    };

    await SystemLog.create({
      level: database === "ONLINE" ? "INFO" : "WARNING",
      component: "API",
      message: `Healthcheck executed (db=${database}, api=${api.status}, scheduler=${scheduler.status}, backup=${backup.status})`,
      metadata: { requestedBy: req.user?.username || null },
    });

    return ok(res, result, { timezone: "Asia/Jakarta" });
  } catch (err) {
    next(err);
  }
};

exports.restartService = async (req, res, next) => {
  try {
    const { service } = req.params;
    const { confirm } = req.body || {};
    if (confirm !== true) {
      return fail(res, 400, "BAD_REQUEST", "confirm must be true");
    }

    await SystemLog.create({
      level: "WARNING",
      component: "API",
      message: `Service restart requested: ${service}`,
      metadata: { service, requestedBy: req.user?.username || null },
    });

    return ok(res, { service, status: "RESTARTING" });
  } catch (err) {
    next(err);
  }
};
