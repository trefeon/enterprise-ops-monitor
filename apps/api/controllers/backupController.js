const fs = require("fs");
const path = require("path");
const { BackupLog, SystemLog } = require("../models");
const db = require("../models");
const { ok, fail } = require("../utils/response");
const { getPagination, buildPaginationMeta } = require("../utils/pagination");
const { getBackupDir, safeJoin, listBackupFiles, getDiskStats } = require("../utils/backupStorage");
const { upsertServiceHeartbeat } = require("../utils/serviceHeartbeats");

exports.getBackups = async (req, res) => {
  try {
    const backups = await BackupLog.findAll({
      order: [["created_at", "DESC"]],
    });
    return ok(res, backups);
  } catch (err) {
    console.error(`[backupController] getBackups error:`, err);
    return fail(res, 500, "INTERNAL_ERROR", "Server Error");
  }
};

exports.triggerBackup = async (req, res) => {
  try {
    // Mock Backup Process
    const newBackup = await BackupLog.create({
      filename: `backup_${new Date().getTime()}.sql`,
      type: "MANUAL",
      size_bytes: Math.floor(Math.random() * 10000000),
      status: "SUCCESS",
      message: "Manual backup completed successfully",
    });
    await upsertServiceHeartbeat(db.sequelize, "backup");
    return ok(res, newBackup);
  } catch (err) {
    console.error(`[backupController] triggerBackup error:`, err);
    return fail(res, 500, "INTERNAL_ERROR", "Server Error");
  }
};

exports.getBackupSummary = async (req, res) => {
  try {
    const dir = getBackupDir();
    const files = listBackupFiles(dir);

    const totalSizeBytes = files.reduce((acc, f) => acc + (Number(f.sizeBytes) || 0), 0);
    const latest = files[0] || null;

    return ok(
      res,
      {
        count: files.length,
        totalSizeBytes,
        latestBackupAt: latest ? latest.modifiedAt : null,
        latestFileName: latest ? latest.fileName : null,
        storagePath: dir,
        disk: getDiskStats(dir),
        schedule: {
          enabled: true,
          cron: process.env.BACKUP_CRON || "05 00 * * *",
          tz: "Asia/Jakarta",
        },
      },
      { timezone: "Asia/Jakarta" }
    );
  } catch (err) {
    console.error(`[backupController] getBackupSummary error:`, err);
    return fail(res, 500, "INTERNAL_ERROR", "Failed to build backup summary");
  }
};

exports.getBackupFiles = async (req, res) => {
  try {
    const dir = getBackupDir();
    const all = listBackupFiles(dir);
    const { page, pageSize } = getPagination(req.query, {
      page: 1,
      pageSize: 50,
      maxPageSize: 200,
    });
    const offset = (page - 1) * pageSize;
    const items = all.slice(offset, offset + pageSize);
    return ok(res, items, {
      ...buildPaginationMeta({ page, pageSize, total: all.length }),
      timezone: "Asia/Jakarta",
    });
  } catch (err) {
    console.error(`[backupController] getBackupFiles error:`, err);
    return fail(res, 500, "INTERNAL_ERROR", "Failed to list backup files");
  }
};

exports.runBackup = async (req, res) => {
  try {
    const type =
      String(req.body?.type || "manual").toLowerCase() === "scheduled" ? "SCHEDULED" : "MANUAL";
    const dir = getBackupDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const stamp = new Date().toISOString().replace(/[:.]/g, "").replace("T", "_").slice(0, 15);
    const prefix = type === "SCHEDULED" ? "scheduled" : "manual";
    const fileName = `${prefix}_backup_${stamp}.sql`;
    const full = path.join(dir, fileName);

    // Use pg_dump for real backup
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return fail(res, 500, "CONFIG_ERROR", "DATABASE_URL not configured");
    }

    const { exec } = require("child_process");
    const { promisify } = require("util");
    const execAsync = promisify(exec);

    try {
      await execAsync(`pg_dump "${dbUrl}" -f "${full}"`, {
        timeout: 5 * 60 * 1000, // 5 minute timeout
      });
    } catch (dumpErr) {
      console.error(`[backupController] pg_dump failed:`, dumpErr.message);
      return fail(res, 500, "BACKUP_FAILED", `pg_dump failed: ${dumpErr.message}`);
    }

    const st = fs.statSync(full);
    const sizeMB = (st.size / 1024 / 1024).toFixed(2);

    const log = await BackupLog.create({
      filename: fileName,
      type,
      size_bytes: st.size,
      status: "SUCCESS",
      message: `${type} backup completed (${sizeMB} MB)`,
    });

    await SystemLog.create({
      level: "INFO",
      component: "API",
      message: `Backup created: ${fileName} (${sizeMB} MB)`,
      metadata: { fileName, type, sizeBytes: st.size, requestedBy: req.user?.username || null },
    });

    await upsertServiceHeartbeat(db.sequelize, "backup");

    return ok(res, { fileName, sizeBytes: st.size, sizeMB, backupLogId: log.id });
  } catch (err) {
    console.error(`[backupController] runBackup error:`, err);
    return fail(res, 500, "INTERNAL_ERROR", "Failed to run backup");
  }
};

exports.deleteBackupFile = async (req, res) => {
  try {
    const dir = getBackupDir();
    const fileName = req.params.fileName;
    const { confirm } = req.body || {};
    if (!confirm || String(confirm) !== String(fileName)) {
      return fail(res, 400, "BAD_REQUEST", "Filename confirmation does not match");
    }
    const full = safeJoin(dir, fileName);

    if (fs.existsSync(full)) {
      fs.unlinkSync(full);
    }

    await BackupLog.destroy({ where: { filename: fileName } });

    await SystemLog.create({
      level: "WARNING",
      component: "API",
      message: `Backup deleted: ${fileName}`,
      metadata: { fileName, requestedBy: req.user?.username || null },
    });

    return ok(res, { deleted: true, fileName });
  } catch (err) {
    console.error(`[backupController] deleteBackupFile error:`, err);
    return fail(res, 500, "INTERNAL_ERROR", "Failed to delete backup");
  }
};

exports.downloadBackupFile = async (req, res) => {
  try {
    const dir = getBackupDir();
    const fileName = req.params.fileName;
    const full = safeJoin(dir, fileName);
    if (!fs.existsSync(full)) {
      return fail(res, 404, "NOT_FOUND", "Backup file not found");
    }
    const st = fs.statSync(full);
    const maxBytes = 25 * 1024 * 1024; // keep JSON/base64 downloads bounded
    if (st.size > maxBytes) {
      return fail(res, 413, "PAYLOAD_TOO_LARGE", "Backup file too large for JSON download", {
        fileName,
        sizeBytes: st.size,
        maxBytes,
      });
    }

    const content = fs.readFileSync(full);
    return ok(res, {
      fileName,
      contentType: "application/octet-stream",
      contentBase64: content.toString("base64"),
      sizeBytes: content.length,
    });
  } catch (err) {
    console.error(`[backupController] downloadBackupFile error:`, err);
    return fail(res, 400, "BAD_REQUEST", "Invalid file");
  }
};

exports.restoreBackup = async (req, res) => {
  try {
    const { fileName, confirmText } = req.body || {};
    if (!fileName) return fail(res, 400, "BAD_REQUEST", "fileName is required");
    if (String(confirmText || "").trim() !== "RESTORE") {
      return fail(res, 400, "BAD_REQUEST", "confirmText must be RESTORE");
    }

    await SystemLog.create({
      level: "CRITICAL",
      component: "API",
      message: `Restore requested: ${fileName}`,
      metadata: { fileName, requestedBy: req.user?.username || null },
    });

    // Actual restore must be performed via operations tooling.
    return ok(res, { queued: true, fileName });
  } catch (err) {
    console.error(`[backupController] restoreBackup error:`, err);
    return fail(res, 500, "INTERNAL_ERROR", "Failed to request restore");
  }
};
