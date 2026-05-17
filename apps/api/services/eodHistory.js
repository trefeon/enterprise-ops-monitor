const { sequelize, Sequelize } = require("../models");
const { getBranchNameById } = require("./dataClient");

function parsePercent(value) {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  const parsed = Number.parseFloat(String(value).replace("%", "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function isComplete(statusSales, uploadPercent) {
  const status = String(statusSales || "")
    .trim()
    .toLowerCase();
  return status === "ok" && uploadPercent >= 100;
}

function isMissingHistoryTable(error) {
  if (!error) return false;
  if (error.original && error.original.code === "42P01") return true;
  const message = error.message || "";
  return /stores_eod_history/i.test(message) && /does not exist|undefined/i.test(message);
}

async function runHistoryQuery(sql, replacements) {
  try {
    return await sequelize.query(sql, {
      replacements,
      type: Sequelize.QueryTypes.SELECT,
    });
  } catch (error) {
    if (isMissingHistoryTable(error)) return null;
    throw error;
  }
}

function summarizeHistoryRows(rows) {
  const stats = new Map();
  for (const row of rows) {
    const areaId = row.idcabang != null ? String(row.idcabang) : "UNKNOWN";
    const areaName = getBranchNameById(areaId) || areaId;
    if (!stats.has(areaId)) {
      stats.set(areaId, {
        areaId,
        areaName,
        storesTotal: 0,
        done: 0,
        pending: 0,
        failed: 0,
      });
    }

    const uploadPercent = parsePercent(row.persentaseuploadstok);
    const done = isComplete(row.statussales, uploadPercent);

    const record = stats.get(areaId);
    record.storesTotal += 1;
    if (done) {
      record.done += 1;
    } else {
      record.failed += 1;
    }
  }

  return Array.from(stats.values()).map((row) => ({
    ...row,
    completionRate: row.storesTotal > 0 ? row.done / row.storesTotal : 0,
  }));
}

async function fetchHistorySummaryByBranch(date) {
  const rows = await runHistoryQuery(
    `
      SELECT idcabang, statussales, persentaseuploadstok
      FROM stores_eod_history
      WHERE recorded_date = :date
    `,
    { date }
  );
  if (rows === null) return null;
  return summarizeHistoryRows(rows);
}

async function fetchHistoryRowsByDate(date) {
  const rows = await runHistoryQuery(
    `
      SELECT
        recorded_date,
        kodetoko,
        namatoko,
        idcabang,
        area,
        regional,
        statussales,
        persentaseuploadstok,
        tglbisnis
      FROM stores_eod_history
      WHERE recorded_date = :date
    `,
    { date }
  );
  return rows;
}

async function fetchHistoryByStore(storeCode, from, to) {
  const rows = await runHistoryQuery(
    `
      SELECT
        recorded_date,
        kodetoko,
        namatoko,
        idcabang,
        area,
        regional,
        statussales,
        persentaseuploadstok,
        tglbisnis
      FROM stores_eod_history
      WHERE kodetoko = :storeCode
        AND recorded_date BETWEEN :from AND :to
      ORDER BY recorded_date ASC
    `,
    { storeCode, from, to }
  );
  return rows;
}

module.exports = {
  parsePercent,
  isComplete,
  fetchHistorySummaryByBranch,
  fetchHistoryRowsByDate,
  fetchHistoryByStore,
};
