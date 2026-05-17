const fs = require("fs");
const path = require("path");
const { toWibIso } = require("./time");

function getBackupDir() {
  return process.env.BACKUP_DIR || "/backups";
}

function inferType(fileName) {
  const lower = String(fileName).toLowerCase();
  if (lower.includes("scheduled")) return "scheduled";
  if (lower.includes("manual")) return "manual";
  return "unknown";
}

function inferDate(fileName, mtime) {
  const name = String(fileName);
  const m1 = name.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;
  if (mtime) return new Date(mtime).toISOString().slice(0, 10);
  return null;
}

function safeJoin(dir, fileName) {
  const normalizedDir = path.normalize(dir + path.sep);
  const joined = path.normalize(path.join(dir, fileName));
  if (!joined.startsWith(normalizedDir)) {
    throw new Error("Invalid file path");
  }
  return joined;
}

function listBackupFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".sql") && !entry.name.endsWith(".dump")) continue;

    const full = path.join(dir, entry.name);
    const stat = fs.statSync(full);

    files.push({
      fileName: entry.name,
      type: inferType(entry.name),
      date: inferDate(entry.name, stat.mtime),
      sizeBytes: stat.size,
      modifiedAt: toWibIso(stat.mtime),
    });
  }

  files.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
  return files;
}

function getDiskStats(dir) {
  try {
    const stats = fs.statfsSync(dir);
    const total = stats.bsize * stats.blocks;
    const free = stats.bsize * stats.bavail;
    const used = total - free;

    return {
      totalBytes: total,
      freeBytes: free,
      usedBytes: used,
      usedPercent: total > 0 ? (used / total) * 100 : 0,
    };
  } catch (_) {
    return null;
  }
}

module.exports = {
  getBackupDir,
  safeJoin,
  listBackupFiles,
  getDiskStats,
};
