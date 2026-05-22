const live = require("./dataGateway");
const db = require("./dataDb");
const { toWibDate } = require("../utils/time");

function truthy(value) {
  if (value == null) return false;
  const v = String(value).trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "y" || v === "on";
}

function shouldTryDb() {
  // Default: try DB first (auto). Set DATA_USE_DB=false to force live.
  if (valueIsExplicitFalse(process.env.DATA_USE_DB)) return false;
  if (process.env.SEED_DEMO_DATA === "true") return false;
  return true;
}

function valueIsExplicitFalse(value) {
  if (value == null) return false;
  const v = String(value).trim().toLowerCase();
  return v === "0" || v === "false" || v === "no" || v === "off";
}

async function fetchEodAllBranches(options = {}) {
  if (shouldTryDb()) {
    const recordedDate = options?.date || toWibDate();
    try {
      const rows = (await db.fetchEodHistoryByRecordedDate(recordedDate)) || null;
      if (Array.isArray(rows) && rows.length > 0) {
        return {
          rows,
          businessDate: recordedDate,
          fetchedAt: new Date().toISOString(),
          source: "db",
        };
      }
    } catch (error) {
      console.warn(
        "[dataSource] DB EOD fetch failed, falling back to live:",
        error?.message || error
      );
    }
  }

  const liveRes = await live.fetchEodAllBranches(options);
  return { ...liveRes, source: "live" };
}

async function fetchEmployeesAllBranches(options = {}) {
  if (shouldTryDb()) {
    try {
      const rows = (await db.fetchEmployeesAll()) || null;
      if (Array.isArray(rows) && rows.length > 0) {
        return { rows, fetchedAt: new Date().toISOString(), source: "db" };
      }
    } catch (error) {
      console.warn(
        "[dataSource] DB employee fetch failed, falling back to live:",
        error?.message || error
      );
    }
  }

  const liveRes = await live.fetchEmployeesAllBranches(options);
  return { ...liveRes, source: "live" };
}

module.exports = {
  ...live,
  fetchEodAllBranches,
  fetchEmployeesAllBranches,
  truthy,
};
