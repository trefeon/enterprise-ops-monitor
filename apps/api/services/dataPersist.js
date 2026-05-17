const { sequelize } = require("../models");

function isMissingTable(error) {
  if (!error) return false;
  const code = error?.original?.code || error?.parent?.code || error?.code;
  return code === "42P01"; // undefined_table
}

async function safeExec(sql, replacements, { transaction } = {}) {
  try {
    await sequelize.query(sql, { replacements, transaction });
    return { ok: true };
  } catch (error) {
    if (isMissingTable(error)) return { ok: false, skipped: true, reason: "missing_table" };
    throw error;
  }
}

function chunk(items, size) {
  const res = [];
  for (let i = 0; i < items.length; i += size) res.push(items.slice(i, i + size));
  return res;
}

function toInt(value) {
  if (value == null) return null;
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

function toSmallInt(value) {
  const n = toInt(value);
  if (n == null) return null;
  if (n < -32768 || n > 32767) return null;
  return n;
}

function toPercentInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n);
  if (r < 0) return 0;
  if (r > 100) return 100;
  return r;
}

function toJson(value) {
  if (value == null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function parseTimesCsv(value, fallback) {
  const raw = value == null ? "" : String(value);
  const items = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length > 0) return items;
  return fallback;
}

async function upsertStores(eodRows, { batchSize = 250, transaction } = {}) {
  const rows = (Array.isArray(eodRows) ? eodRows : [])
    .map((r) => {
      const storeCode = toInt(r.storeCode);
      if (storeCode == null) return null;
      const branchId = toSmallInt(r.branchId);
      return {
        storeCode,
        storeName: r.storeName != null ? String(r.storeName) : null,
        branchId,
        area: r.area != null ? String(r.area) : null,
        regional: r.regional != null ? String(r.regional) : null,
        nikAc: r.nikAc != null ? String(r.nikAc) : null,
        nikRh: r.nikRh != null ? String(r.nikRh) : null,
        raw: toJson(r.raw),
      };
    })
    .filter(Boolean);

  for (const batch of chunk(rows, batchSize)) {
    const values = batch
      .map(
        (_, i) =>
          `(:store_code_${i}, :store_name_${i}, :branch_id_${i}, :area_${i}, :regional_${i}, :nik_ac_${i}, :nik_rh_${i}, NOW(), NOW(), CAST(:raw_payload_${i} AS JSONB))`
      )
      .join(",\n");

    const replacements = {};
    batch.forEach((r, i) => {
      replacements[`store_code_${i}`] = r.storeCode;
      replacements[`store_name_${i}`] = r.storeName || `STORE_${r.storeCode}`;
      replacements[`branch_id_${i}`] = r.branchId;
      replacements[`area_${i}`] = r.area;
      replacements[`regional_${i}`] = r.regional;
      replacements[`nik_ac_${i}`] = r.nikAc;
      replacements[`nik_rh_${i}`] = r.nikRh;
      replacements[`raw_payload_${i}`] = r.raw;
    });

    const sql = `
      INSERT INTO data_stores (
        store_code, store_name, branch_id, area, regional, nik_ac, nik_rh, last_seen_at, last_sync, raw_payload
      ) VALUES
      ${values}
      ON CONFLICT (store_code) DO UPDATE SET
        store_name = EXCLUDED.store_name,
        branch_id = EXCLUDED.branch_id,
        area = COALESCE(EXCLUDED.area, data_stores.area),
        regional = COALESCE(EXCLUDED.regional, data_stores.regional),
        nik_ac = COALESCE(EXCLUDED.nik_ac, data_stores.nik_ac),
        nik_rh = COALESCE(EXCLUDED.nik_rh, data_stores.nik_rh),
        last_seen_at = NOW(),
        last_sync = NOW(),
        raw_payload = EXCLUDED.raw_payload;
    `;

    const result = await safeExec(sql, replacements, { transaction });
    if (result.skipped) return result;

    // Keep a stable master list of stores for Store Sync KPIs.
    // This table is optional; skip if not present.
    const masterSql = `
      INSERT INTO stores_master (
        kodetoko,
        nama_toko,
        branch_id,
        area,
        regional,
        is_active,
        last_seen_at,
        created_at,
        updated_at
      ) VALUES
      ${batch
        .map(
          (_, i) =>
            `(:kodetoko_${i}, :nama_toko_${i}, :branch_id_txt_${i}, :area_txt_${i}, :regional_txt_${i}, TRUE, NOW(), NOW(), NOW())`
        )
        .join(",\n")}
      ON CONFLICT (kodetoko) DO UPDATE SET
        nama_toko = COALESCE(EXCLUDED.nama_toko, stores_master.nama_toko),
        branch_id = CASE
          WHEN EXCLUDED.branch_id = '0' THEN stores_master.branch_id
          ELSE EXCLUDED.branch_id
        END,
        area = COALESCE(EXCLUDED.area, stores_master.area),
        regional = COALESCE(EXCLUDED.regional, stores_master.regional),
        is_active = TRUE,
        last_seen_at = NOW(),
        updated_at = NOW();
    `;

    const masterRepl = {};
    batch.forEach((r, i) => {
      masterRepl[`kodetoko_${i}`] = r.storeCode;
      masterRepl[`nama_toko_${i}`] = r.storeName || `STORE_${r.storeCode}`;
      masterRepl[`branch_id_txt_${i}`] = r.branchId != null ? String(r.branchId) : "0";
      masterRepl[`area_txt_${i}`] = r.area;
      masterRepl[`regional_txt_${i}`] = r.regional;
    });

    const masterResult = await safeExec(masterSql, masterRepl, { transaction });
    if (masterResult.skipped) {
      // not fatal
    }
  }

  return { ok: true };
}

async function upsertEodCurrent(eodRows, { batchSize = 250, transaction } = {}) {
  const rows = (Array.isArray(eodRows) ? eodRows : [])
    .map((r) => {
      const storeCode = toInt(r.storeCode);
      if (storeCode == null) return null;
      return {
        storeCode,
        businessDate: r.businessDate || null,
        statusSales: r.statusSales || null,
        uploadPercent: toPercentInt(r.uploadPercent),
        uploadRaw: r.raw?.persentaseuploadstok != null ? String(r.raw.persentaseuploadstok) : null,
        eodAt: r.eodAt || null,
        uploadAt: r.uploadAt || null,
        maxUploadAt: r.maxUploadAt || null,
        raw: toJson(r.raw),
      };
    })
    .filter(Boolean);

  for (const batch of chunk(rows, batchSize)) {
    const values = batch
      .map(
        (_, i) =>
          `(:store_code_${i}, :business_date_${i}, :status_sales_${i}, :upload_stock_percent_${i}, :upload_stock_raw_${i}, :eod_at_${i}, :upload_at_${i}, :max_upload_at_${i}, NOW(), CAST(:raw_payload_${i} AS JSONB))`
      )
      .join(",\n");

    const replacements = {};
    batch.forEach((r, i) => {
      replacements[`store_code_${i}`] = r.storeCode;
      replacements[`business_date_${i}`] = r.businessDate;
      replacements[`status_sales_${i}`] = r.statusSales;
      replacements[`upload_stock_percent_${i}`] = r.uploadPercent;
      replacements[`upload_stock_raw_${i}`] = r.uploadRaw;
      replacements[`eod_at_${i}`] = r.eodAt;
      replacements[`upload_at_${i}`] = r.uploadAt;
      replacements[`max_upload_at_${i}`] = r.maxUploadAt;
      replacements[`raw_payload_${i}`] = r.raw;
    });

    const sql = `
      INSERT INTO data_store_eod_current (
        store_code,
        business_date,
        status_sales,
        upload_stock_percent,
        upload_stock_raw,
        eod_at,
        upload_at,
        max_upload_at,
        source_synced_at,
        raw_payload
      ) VALUES
      ${values}
      ON CONFLICT (store_code) DO UPDATE SET
        business_date = EXCLUDED.business_date,
        -- Date changed → new day, accept fresh data (full reset)
        -- Same date   → "Ok is Final" protection
        status_sales = CASE
          WHEN EXCLUDED.business_date IS DISTINCT FROM data_store_eod_current.business_date
            THEN EXCLUDED.status_sales
          WHEN data_store_eod_current.status_sales = 'Ok' THEN 'Ok'
          ELSE EXCLUDED.status_sales
        END,
        -- Date changed → accept incoming percent
        -- Same date   → keep higher percent
        upload_stock_percent = CASE
          WHEN EXCLUDED.business_date IS DISTINCT FROM data_store_eod_current.business_date
            THEN COALESCE(EXCLUDED.upload_stock_percent, 0)
          ELSE GREATEST(
            COALESCE(data_store_eod_current.upload_stock_percent, 0),
            COALESCE(EXCLUDED.upload_stock_percent, 0)
          )
        END,
        upload_stock_raw = CASE
          WHEN EXCLUDED.business_date IS DISTINCT FROM data_store_eod_current.business_date
            THEN EXCLUDED.upload_stock_raw
          WHEN COALESCE(EXCLUDED.upload_stock_percent, 0) >= COALESCE(data_store_eod_current.upload_stock_percent, 0)
            THEN EXCLUDED.upload_stock_raw
          ELSE data_store_eod_current.upload_stock_raw
        END,
        eod_at = CASE
          WHEN EXCLUDED.business_date IS DISTINCT FROM data_store_eod_current.business_date
            THEN EXCLUDED.eod_at
          ELSE COALESCE(EXCLUDED.eod_at, data_store_eod_current.eod_at)
        END,
        upload_at = CASE
          WHEN EXCLUDED.business_date IS DISTINCT FROM data_store_eod_current.business_date
            THEN EXCLUDED.upload_at
          ELSE COALESCE(EXCLUDED.upload_at, data_store_eod_current.upload_at)
        END,
        max_upload_at = CASE
          WHEN EXCLUDED.business_date IS DISTINCT FROM data_store_eod_current.business_date
            THEN EXCLUDED.max_upload_at
          ELSE COALESCE(EXCLUDED.max_upload_at, data_store_eod_current.max_upload_at)
        END,
        source_synced_at = NOW(),
        raw_payload = EXCLUDED.raw_payload;
    `;

    const result = await safeExec(sql, replacements, { transaction });
    if (result.skipped) return result;
  }

  return { ok: true };
}

async function upsertEodHistory(eodRows, recordedDate, { batchSize = 250, transaction } = {}) {
  const rows = (Array.isArray(eodRows) ? eodRows : [])
    .map((r) => {
      const storeCode = toInt(r.storeCode);
      if (storeCode == null) return null;
      return {
        storeCode,
        businessDate: r.businessDate || null,
        recordedDate,
        statusSales: r.statusSales || null,
        uploadPercent: toPercentInt(r.uploadPercent),
        uploadRaw: r.raw?.persentaseuploadstok != null ? String(r.raw.persentaseuploadstok) : null,
        eodAt: r.eodAt || null,
        uploadAt: r.uploadAt || null,
        maxUploadAt: r.maxUploadAt || null,
        raw: toJson(r.raw),
      };
    })
    .filter(Boolean);

  for (const batch of chunk(rows, batchSize)) {
    const values = batch
      .map(
        (_, i) =>
          `(:store_code_${i}, :business_date_${i}, :recorded_date_${i}, NOW(), :status_sales_${i}, :upload_stock_percent_${i}, :upload_stock_raw_${i}, :eod_at_${i}, :upload_at_${i}, :max_upload_at_${i}, CAST(:raw_payload_${i} AS JSONB))`
      )
      .join(",\n");

    const replacements = {};
    batch.forEach((r, i) => {
      replacements[`store_code_${i}`] = r.storeCode;
      replacements[`business_date_${i}`] = r.businessDate;
      replacements[`recorded_date_${i}`] = r.recordedDate;
      replacements[`status_sales_${i}`] = r.statusSales;
      replacements[`upload_stock_percent_${i}`] = r.uploadPercent;
      replacements[`upload_stock_raw_${i}`] = r.uploadRaw;
      replacements[`eod_at_${i}`] = r.eodAt;
      replacements[`upload_at_${i}`] = r.uploadAt;
      replacements[`max_upload_at_${i}`] = r.maxUploadAt;
      replacements[`raw_payload_${i}`] = r.raw;
    });

    const sql = `
      INSERT INTO data_store_eod_history (
        store_code,
        business_date,
        recorded_date,
        recorded_at,
        status_sales,
        upload_stock_percent,
        upload_stock_raw,
        eod_at,
        upload_at,
        max_upload_at,
        raw_payload
      ) VALUES
      ${values}
      ON CONFLICT (store_code, recorded_date) DO UPDATE SET
        business_date = COALESCE(EXCLUDED.business_date, data_store_eod_history.business_date),
        recorded_at = NOW(),
        -- Once 'Ok', never downgrade back to 'Not Ok'
        status_sales = CASE
          WHEN data_store_eod_history.status_sales = 'Ok' THEN 'Ok'
          ELSE EXCLUDED.status_sales
        END,
        -- Keep the higher upload percent (progress only goes up)
        upload_stock_percent = GREATEST(
          COALESCE(data_store_eod_history.upload_stock_percent, 0),
          COALESCE(EXCLUDED.upload_stock_percent, 0)
        ),
        upload_stock_raw = CASE
          WHEN COALESCE(EXCLUDED.upload_stock_percent, 0) >= COALESCE(data_store_eod_history.upload_stock_percent, 0)
          THEN EXCLUDED.upload_stock_raw
          ELSE data_store_eod_history.upload_stock_raw
        END,
        -- Keep the latest non-null timestamps
        eod_at = COALESCE(EXCLUDED.eod_at, data_store_eod_history.eod_at),
        upload_at = COALESCE(EXCLUDED.upload_at, data_store_eod_history.upload_at),
        max_upload_at = COALESCE(EXCLUDED.max_upload_at, data_store_eod_history.max_upload_at),
        raw_payload = EXCLUDED.raw_payload;
    `;

    const result = await safeExec(sql, replacements, { transaction });
    if (result.skipped) return result;
  }

  return { ok: true };
}

async function upsertEmployees(employeeRows, { batchSize = 250, transaction } = {}) {
  const rows = (Array.isArray(employeeRows) ? employeeRows : [])
    .map((r) => {
      const nik = r.empid != null ? String(r.empid) : null;
      if (!nik) return null;
      return {
        nik,
        fullName: r.name != null ? String(r.name) : null,
        jobName: r.jobName != null ? String(r.jobName) : null,
        branchId: toSmallInt(r.branchId),
        storeCode: toInt(r.storeCode),
        branchName: r.branchName != null ? String(r.branchName) : null,
        storeName: r.storeName != null ? String(r.storeName) : null,
        raw: toJson(r.raw),
      };
    })
    .filter((r) => r && r.fullName);

  for (const batch of chunk(rows, batchSize)) {
    const values = batch
      .map(
        (_, i) =>
          `(:nik_${i}, :full_name_${i}, :job_name_${i}, :branch_id_${i}, :store_code_${i}, :branch_name_${i}, :store_name_${i}, 'ACTIVE', NOW(), CAST(:raw_payload_${i} AS JSONB))`
      )
      .join(",\n");

    const replacements = {};
    batch.forEach((r, i) => {
      replacements[`nik_${i}`] = r.nik;
      replacements[`full_name_${i}`] = r.fullName;
      replacements[`job_name_${i}`] = r.jobName;
      replacements[`branch_id_${i}`] = r.branchId;
      replacements[`store_code_${i}`] = r.storeCode;
      replacements[`branch_name_${i}`] = r.branchName;
      replacements[`store_name_${i}`] = r.storeName;
      replacements[`raw_payload_${i}`] = r.raw;
    });

    const sql = `
      INSERT INTO data_employees (
        nik,
        full_name,
        job_name,
        branch_id,
        store_code,
        branch_name,
        store_name,
        status,
        last_synced_at,
        raw_payload
      ) VALUES
      ${values}
      ON CONFLICT (nik) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        job_name = COALESCE(EXCLUDED.job_name, data_employees.job_name),
        branch_id = COALESCE(EXCLUDED.branch_id, data_employees.branch_id),
        store_code = COALESCE(EXCLUDED.store_code, data_employees.store_code),
        branch_name = COALESCE(EXCLUDED.branch_name, data_employees.branch_name),
        store_name = COALESCE(EXCLUDED.store_name, data_employees.store_name),
        status = 'ACTIVE',
        last_synced_at = NOW(),
        raw_payload = EXCLUDED.raw_payload;
    `;

    const result = await safeExec(sql, replacements, { transaction });
    if (result.skipped) return result;
  }

  return { ok: true };
}

/**
 * Remove stale rows from data_store_eod_current for stores whose business_date
 * is older than today. The eod_current table is a "today snapshot" — any row
 * with an older date is stale (the data is already preserved in eod_history).
 * This covers both "toko tutup" (stores the internal data API no longer returns) and stores
 * that the internal data API still returns but with an outdated business_date.
 */
async function cleanupStaleEodCurrent(activeStoreCodes, today, { transaction } = {}) {
  if (!today) {
    return { ok: true, deleted: 0, skipped: true, reason: "no_today" };
  }

  const sql = `
    DELETE FROM data_store_eod_current
    WHERE business_date < :today
  `;

  try {
    const [, meta] = await sequelize.query(sql, {
      replacements: { today },
      transaction,
    });
    const deleted = meta?.rowCount ?? 0;
    if (deleted > 0) {
      console.log(
        `[dataPersist] Cleaned up ${deleted} stale eod_current rows (business_date < ${today})`
      );
    }
    return { ok: true, deleted };
  } catch (error) {
    if (isMissingTable(error)) {
      return { ok: false, deleted: 0, skipped: true, reason: "missing_table" };
    }
    // Non-fatal: log but don't crash the sync
    console.warn("[dataPersist] Stale eod_current cleanup failed:", error?.message || error);
    return { ok: false, deleted: 0, error: error?.message };
  }
}

module.exports = {
  parseTimesCsv,
  upsertStores,
  upsertEodCurrent,
  upsertEodHistory,
  upsertEmployees,
  cleanupStaleEodCurrent,
};
