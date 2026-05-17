/**
 * Backup Service
 * Handles scheduled database backups and cleanup of old backup files.
 */
const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const db = require("../models");
const { getBackupDir, listBackupFiles } = require("../utils/backupStorage");
const { upsertServiceHeartbeat } = require("../utils/serviceHeartbeats");

const execAsync = promisify(exec);

/**
 * Run a scheduled database backup using pg_dump.
 * Saves to /backups/scheduled_backup_YYYYMMDD_HHMMSS.sql
 */
async function runScheduledBackup() {
  const dir = getBackupDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, "").replace("T", "_").slice(0, 15);
  const fileName = `scheduled_backup_${stamp}.sql`;
  const fullPath = path.join(dir, fileName);

  // Build pg_dump command
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL not configured");
  }

  console.log(`[backupService] Starting scheduled backup: ${fileName}`);

  try {
    // Run pg_dump with compression-friendly format
    const { stderr } = await execAsync(`pg_dump "${dbUrl}" -f "${fullPath}"`, {
      timeout: 5 * 60 * 1000, // 5 minute timeout
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for stderr
    });

    if (stderr && stderr.trim()) {
      console.warn(`[backupService] pg_dump warnings: ${stderr}`);
    }

    // Get file stats
    const stats = fs.statSync(fullPath);
    const sizeBytes = stats.size;
    const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);

    console.log(`[backupService] Backup completed: ${fileName} (${sizeMB} MB)`);

    // Log to BackupLog table
    await db.BackupLog.create({
      filename: fileName,
      type: "SCHEDULED",
      size_bytes: sizeBytes,
      status: "SUCCESS",
      message: `Scheduled backup completed (${sizeMB} MB)`,
    });

    // Log to SystemLog
    await db.SystemLog.create({
      level: "INFO",
      component: "BACKUP",
      message: `Scheduled backup created: ${fileName}`,
      metadata: { fileName, sizeBytes, sizeMB },
    });

    // Update heartbeat
    await upsertServiceHeartbeat(db.sequelize, "backup");

    return { success: true, fileName, sizeBytes };
  } catch (error) {
    console.error(`[backupService] Backup failed:`, error.message);

    // Log failure
    await db.BackupLog.create({
      filename: fileName,
      type: "SCHEDULED",
      size_bytes: 0,
      status: "FAILED",
      message: error.message,
    });

    await db.SystemLog.create({
      level: "ERROR",
      component: "BACKUP",
      message: `Scheduled backup failed: ${error.message}`,
      metadata: { fileName, error: error.message },
    });

    throw error;
  }
}

/**
 * Delete backup files older than retentionDays.
 * @param {number} retentionDays - Number of days to keep backups (default: 7)
 */
async function cleanupOldBackups(retentionDays = 7) {
  const dir = getBackupDir();
  const files = listBackupFiles(dir);
  const now = Date.now();
  const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;

  let deletedCount = 0;
  let deletedBytes = 0;

  for (const file of files) {
    const fileDate = new Date(file.modifiedAt);
    const ageMs = now - fileDate.getTime();

    if (ageMs > maxAgeMs) {
      const fullPath = path.join(dir, file.fileName);
      try {
        fs.unlinkSync(fullPath);
        deletedCount++;
        deletedBytes += file.sizeBytes || 0;
        console.log(`[backupService] Deleted old backup: ${file.fileName}`);
      } catch (err) {
        console.warn(`[backupService] Failed to delete ${file.fileName}:`, err.message);
      }
    }
  }

  if (deletedCount > 0) {
    const deletedMB = (deletedBytes / 1024 / 1024).toFixed(2);
    console.log(
      `[backupService] Cleanup complete: ${deletedCount} files deleted (${deletedMB} MB)`
    );

    await db.SystemLog.create({
      level: "INFO",
      component: "BACKUP",
      message: `Backup cleanup: ${deletedCount} old files deleted`,
      metadata: { deletedCount, deletedBytes, retentionDays },
    });
  }

  return { deletedCount, deletedBytes };
}

/**
 * Delete old database log entries to prevent disk/database bloat.
 * Cleans: SystemLog, SyncLog, BackupLog, EODLog (history only)
 * @param {number} retentionDays - Number of days to keep logs (default: 7)
 */
async function cleanupOldLogs(retentionDays = 7) {
  const { Op } = require("sequelize");
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const results = {};

  // 1. Clean SystemLogs (keep last 7 days)
  try {
    const deleted = await db.SystemLog.destroy({
      where: {
        createdAt: { [Op.lt]: cutoffDate },
      },
    });
    results.systemLogs = deleted;
    if (deleted > 0) {
      console.log(`[backupService] Deleted ${deleted} old SystemLog entries`);
    }
  } catch (err) {
    console.warn(`[backupService] Failed to clean SystemLogs:`, err.message);
    results.systemLogs = 0;
  }

  // 2. Clean SyncLogs (if exists)
  if (db.SyncLog) {
    try {
      const deleted = await db.SyncLog.destroy({
        where: {
          createdAt: { [Op.lt]: cutoffDate },
        },
      });
      results.syncLogs = deleted;
      if (deleted > 0) {
        console.log(`[backupService] Deleted ${deleted} old SyncLog entries`);
      }
    } catch (err) {
      console.warn(`[backupService] Failed to clean SyncLogs:`, err.message);
      results.syncLogs = 0;
    }
  }

  // 3. Clean old BackupLogs (keep metadata but limit history)
  try {
    const deleted = await db.BackupLog.destroy({
      where: {
        createdAt: { [Op.lt]: cutoffDate },
        status: "SUCCESS", // Only clean successful old entries, keep failures for debugging
      },
    });
    results.backupLogs = deleted;
    if (deleted > 0) {
      console.log(`[backupService] Deleted ${deleted} old BackupLog entries`);
    }
  } catch (err) {
    console.warn(`[backupService] Failed to clean BackupLogs:`, err.message);
    results.backupLogs = 0;
  }

  // 4. Clean SyncSummaries (if exists)
  if (db.SyncSummary) {
    try {
      const deleted = await db.SyncSummary.destroy({
        where: {
          createdAt: { [Op.lt]: cutoffDate },
        },
      });
      results.syncSummaries = deleted;
      if (deleted > 0) {
        console.log(`[backupService] Deleted ${deleted} old SyncSummary entries`);
      }
    } catch (err) {
      console.warn(`[backupService] Failed to clean SyncSummaries:`, err.message);
      results.syncSummaries = 0;
    }
  }

  const totalDeleted = Object.values(results).reduce((a, b) => a + b, 0);
  if (totalDeleted > 0) {
    console.log(`[backupService] Log cleanup complete: ${totalDeleted} total entries deleted`);

    // Log the cleanup (but don't create infinite loop of logs)
    await db.SystemLog.create({
      level: "INFO",
      component: "MAINTENANCE",
      message: `Database log cleanup: ${totalDeleted} old entries deleted`,
      metadata: { ...results, retentionDays },
    });
  }

  return results;
}

module.exports = {
  runScheduledBackup,
  cleanupOldBackups,
  cleanupOldLogs,
};
