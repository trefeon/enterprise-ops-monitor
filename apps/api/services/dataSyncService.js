const db = require("../models");
const dataClient = require("./dataClient");
const { invalidateEodCache, invalidateEmployeeCache } = require("./dataClient");
const {
  upsertStores,
  upsertEodCurrent,
  upsertEodHistory,
  upsertEmployees,
  cleanupStaleEodCurrent,
} = require("./dataPersist");
const { toWibDate, toWibIso } = require("../utils/time");

function isExplicitFalse(value) {
  if (value == null) return false;
  const v = String(value).trim().toLowerCase();
  return v === "0" || v === "false" || v === "no" || v === "off";
}

function isEnabled(value, defaultValue = true) {
  if (value == null) return defaultValue;
  return !isExplicitFalse(value);
}

async function syncDataToDb({ includeEmployees = true, reason = "scheduled" } = {}) {
  const persistEnabled = isEnabled(process.env.DATA_PERSIST_ENABLED, true);
  const startedAt = new Date();

  // Always fetch live for a sync; DB reads are for serving.
  const [{ rows: eodRows, businessDate }, { rows: employeeRows }] = await Promise.all([
    dataClient.fetchEodAllBranches({ bypassCache: true }),
    includeEmployees
      ? dataClient.fetchEmployeesAllBranches({ bypassCache: true })
      : Promise.resolve({ rows: [] }),
  ]);

  // Refresh in-memory caches so API reads stay hot too.
  invalidateEodCache();
  invalidateEmployeeCache();

  const recordedDate = toWibDate();

  const result = {
    ok: true,
    reason,
    startedAt: toWibIso(startedAt),
    finishedAt: null,
    recordedDate,
    businessDate: businessDate || null,
    fetched: {
      eodRows: Array.isArray(eodRows) ? eodRows.length : 0,
      employeeRows: Array.isArray(employeeRows) ? employeeRows.length : 0,
    },
    persisted: {
      enabled: persistEnabled,
      stores: null,
      eodCurrent: null,
      eodHistory: null,
      employees: null,
      staleCleanup: null,
    },
  };

  if (!persistEnabled) {
    result.finishedAt = toWibIso(new Date());
    return result;
  }

  // SAFETY: If EOD fetch failed (empty), do NOT proceed with potentially destructive sync.
  // This prevents the "validStoreCodes" filter from wiping out all employees.
  if (!eodRows || eodRows.length === 0) {
    console.warn(
      "[dataSyncService] Aborting persist: EOD rows are empty (API failure?). Preserving existing data."
    );
    result.ok = false;
    result.reason = "eod_fetch_empty";
    result.finishedAt = toWibIso(new Date());
    return result;
  }

  // Filter employees to ensure Referential Integrity (FK to data_stores)
  // Employees at Head Office or unknown stores (not in eodRows) will cause crash.
  let validEmployees = employeeRows;
  if (includeEmployees && Array.isArray(employeeRows) && Array.isArray(eodRows)) {
    // 1. Start with stores from the current EOD fetch
    const validStoreCodes = new Set(
      eodRows.map((r) => Number(r.storeCode)).filter((n) => Number.isFinite(n))
    );

    // 2. Add existing stores from DB to be safe (in case EOD fetch partially failed).
    // Optimize: Only fetch store codes that are referenced by employees but NOT in EOD list.
    try {
      const employeeStoreCodes = new Set();
      employeeRows.forEach((emp) => {
        const sc = Number(emp.storeCode);
        if (Number.isFinite(sc)) employeeStoreCodes.add(sc);
      });

      const missingStoreCodes = [...employeeStoreCodes].filter((sc) => !validStoreCodes.has(sc));

      if (missingStoreCodes.length > 0) {
        // Fetch in batches to avoid large query limits (though unlikely to exceed 65535 params)
        const BATCH_SIZE = 5000;
        for (let i = 0; i < missingStoreCodes.length; i += BATCH_SIZE) {
          const batch = missingStoreCodes.slice(i, i + BATCH_SIZE);
          const existingStores = await db.sequelize.query(
            "SELECT store_code FROM data_stores WHERE store_code IN (:codes)",
            {
              replacements: { codes: batch },
              type: db.sequelize.QueryTypes.SELECT,
            }
          );
          existingStores.forEach((row) => {
            const sc = Number(row.store_code || row.storeCode);
            if (Number.isFinite(sc)) validStoreCodes.add(sc);
          });
        }
      }
    } catch (err) {
      console.error("[dataSyncService] Failed to fetch existing store codes:", err);
    }

    const countBefore = employeeRows.length;
    validEmployees = employeeRows.filter((emp) => {
      const sc = Number(emp.storeCode);
      // Keep if storeCode exists in EOD list OR in DB
      return validStoreCodes.has(sc);
    });

    const dropped = countBefore - validEmployees.length;
    if (dropped > 0) {
      console.warn(
        `[dataSyncService] Dropped ${dropped} employees with unknown store_code to prevent FK violation.`
      );
    }
  }

  // Persist in a transaction so reads don't see partial state.
  await db.sequelize.transaction(async (t) => {
    const storesRes = await upsertStores(eodRows, { transaction: t });
    result.persisted.stores = storesRes;

    const currentRes = await upsertEodCurrent(eodRows, { transaction: t });
    result.persisted.eodCurrent = currentRes;

    const historyRes = await upsertEodHistory(eodRows, recordedDate, { transaction: t });
    result.persisted.eodHistory = historyRes;

    if (includeEmployees) {
      const empRes = await upsertEmployees(validEmployees, { transaction: t });
      result.persisted.employees = empRes;
    }

    // Cleanup stale eod_current rows for stores the internal data API no longer returns (toko tutup)
    const activeStoreCodes = eodRows.map((r) => Number(r.storeCode)).filter(Number.isFinite);
    const cleanupRes = await cleanupStaleEodCurrent(activeStoreCodes, recordedDate, {
      transaction: t,
    });
    result.persisted.staleCleanup = cleanupRes;
  });

  result.finishedAt = toWibIso(new Date());
  return result;
}

module.exports = {
  syncDataToDb,
};
