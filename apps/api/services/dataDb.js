const { sequelize, Sequelize } = require("../models");
const { normalizeBranchName } = require("../utils/branchNames");

function isMissingTable(error) {
  if (!error) return false;
  const code = error?.original?.code || error?.parent?.code || error?.code;
  return code === "42P01"; // undefined_table
}

async function safeQuery(sql, replacements) {
  try {
    return await sequelize.query(sql, {
      replacements,
      type: Sequelize.QueryTypes.SELECT,
    });
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

function parsePercent(value) {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  const parsed = Number.parseFloat(String(value).replace("%", "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDateKey(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function computeStatus({ statusSales, uploadPercent, maxUploadAt }) {
  const status = String(statusSales || "")
    .trim()
    .toLowerCase();
  const isDone = status === "ok" && uploadPercent >= 100;
  if (isDone) return "done";

  const deadline = maxUploadAt ? new Date(maxUploadAt) : null;
  if (deadline && !Number.isNaN(deadline.getTime()) && new Date() > deadline) return "failed";
  return "pending";
}

function mapDbEodRow(row, { targetBusinessDate } = {}) {
  const businessDateKey = toDateKey(row.business_date || row.tglbisnis || row.businessDate);
  const isForTargetDate = targetBusinessDate ? businessDateKey === targetBusinessDate : true;

  const uploadPercent = isForTargetDate
    ? parsePercent(row.upload_stock_percent ?? row.upload_stock_raw ?? row.persentaseuploadstok)
    : 0;
  const statusSales = isForTargetDate ? row.status_sales || row.statussales || null : null;
  const eodAt = isForTargetDate ? row.eod_at || row.tgleod || null : null;
  const uploadAt = isForTargetDate ? row.upload_at || row.tglupload || null : null;
  const maxUploadAt = isForTargetDate ? row.max_upload_at || row.maxupload || null : null;

  return {
    storeCode:
      row.store_code != null
        ? String(row.store_code)
        : row.kodetoko != null
          ? String(row.kodetoko)
          : null,
    storeName: row.store_name || row.namatoko || null,
    branchId:
      row.branch_id != null
        ? String(row.branch_id)
        : row.idcabang != null
          ? String(row.idcabang)
          : row.branchId != null
            ? String(row.branchId)
            : "",
    branchName: normalizeBranchName(row.branch_name || row.branchName || null),
    area: row.area || null,
    regional: row.regional || null,
    nikAc: row.nik_ac || row.nikac || null,
    nikRh: row.nik_rh || row.nik_rh || row.NikRH || null,
    statusSales,
    uploadPercent,
    businessDate: businessDateKey,
    eodAt,
    uploadAt,
    maxUploadAt,
    sourceSyncedAt: row.source_synced_at || row.recorded_at || null,
    status: isForTargetDate
      ? computeStatus({
          statusSales,
          uploadPercent,
          maxUploadAt,
        })
      : "pending",
    raw: row.raw_payload || null,
  };
}

async function fetchEodHistoryByRecordedDate(recordedDate) {
  const rows = await safeQuery(
    `
      SELECT
        h.store_code,
        h.business_date,
        h.recorded_at,
        h.status_sales,
        h.upload_stock_percent,
        h.upload_stock_raw,
        h.eod_at,
        h.upload_at,
        h.max_upload_at,
        h.raw_payload,
        s.store_name,
        s.branch_id,
        b.branch_name,
        s.area,
        s.regional,
        s.nik_ac,
        s.nik_rh
      FROM data_store_eod_history h
      JOIN data_stores s ON s.store_code = h.store_code
      LEFT JOIN data_branches b ON b.branch_id = s.branch_id
      WHERE h.recorded_date = :recordedDate
    `,
    { recordedDate }
  );

  if (rows === null) return null;
  return rows.map((row) => mapDbEodRow(row));
}

async function fetchEodCurrent(options = {}) {
  const rows = await safeQuery(
    `
      SELECT
        s.store_name,
        s.store_code,
        s.branch_id,
        b.branch_name,
        s.area,
        s.regional,
        s.nik_ac,
        s.nik_rh,
        c.business_date,
        c.source_synced_at,
        c.status_sales,
        c.upload_stock_percent,
        c.upload_stock_raw,
        c.eod_at,
        c.upload_at,
        c.max_upload_at,
        c.raw_payload
      FROM data_stores s
      LEFT JOIN data_store_eod_current c ON c.store_code = s.store_code
      LEFT JOIN data_branches b ON b.branch_id = s.branch_id
    `,
    {}
  );

  if (rows === null) return null;
  return rows.map((row) => mapDbEodRow(row, options));
}

function mapEmployeeRow(row) {
  return {
    empid: row.nik != null ? String(row.nik) : null,
    name: row.full_name || null,
    jobName: row.job_name || null,
    storeCode: row.store_code != null ? String(row.store_code) : null,
    branchId: row.branch_id != null ? String(row.branch_id) : null,
    branchName: normalizeBranchName(row.branch_name || null),
    storeName: row.store_name || null,
    status: row.status || "ACTIVE",
    source: row.source || "sync",
    lastSyncedAt: row.last_synced_at || null,
    raw: row.raw_payload || null,
  };
}

function mapStoreRow(row) {
  const isActive = row.is_active !== false && row.archived_at == null;
  return {
    storeCode: row.store_code != null ? String(row.store_code) : null,
    storeName: row.store_name || null,
    branchId: row.branch_id != null ? String(row.branch_id) : null,
    branchName: normalizeBranchName(row.branch_name || null),
    regional: row.regional || null,
    area: row.area || null,
    address: row.address || null,
    picName: row.pic_name || null,
    phone: row.contact_number || null,
    isActive,
    status: isActive ? "active" : "inactive",
    source: row.source || "sync",
  };
}

async function fetchEmployeesAll({ includeInactive = false } = {}) {
  const rows = await safeQuery(
    `
      SELECT
        nik,
        full_name,
        job_name,
        branch_id,
        branch_name,
        store_code,
        store_name,
        status,
        source,
        last_synced_at,
        raw_payload
      FROM data_employees
      WHERE (:includeInactive = TRUE OR status = 'ACTIVE')
    `,
    { includeInactive }
  );

  if (rows === null) return null;

  return rows.map(mapEmployeeRow);
}

async function fetchStoresCount() {
  const rows = await safeQuery(
    `
      SELECT COUNT(*)::int AS count
      FROM data_stores
    `,
    {}
  );

  if (rows === null) return null;
  const count = Number(rows?.[0]?.count);
  return Number.isFinite(count) ? count : null;
}

async function fetchStoresAll() {
  const rows = await safeQuery(
    `
      SELECT
        s.store_code,
        s.store_name,
        s.branch_id,
        b.branch_name,
        s.regional,
        s.area,
        s.address,
        s.pic_name,
        s.contact_number,
        s.is_active,
        s.source,
        s.archived_at
      FROM data_stores s
      LEFT JOIN data_branches b ON b.branch_id = s.branch_id
    `,
    {}
  );

  if (rows === null) return null;

  return rows.map(mapStoreRow);
}

async function insertManualStore(data, userId) {
  const rows = await sequelize.query(
    `
      INSERT INTO data_stores (
        store_code, store_name, branch_id, area, regional, address, pic_name, contact_number,
        is_active, source, manual_created_at, manual_updated_at, manual_updated_by, last_seen_at, last_sync, raw_payload
      )
      VALUES (
        :storeCode, :storeName, :branchId, :area, :regional, :address, :picName, :phone,
        TRUE, 'manual', NOW(), NOW(), :userId, NOW(), NOW(), CAST(:rawPayload AS JSONB)
      )
      ON CONFLICT (store_code) DO NOTHING
      RETURNING store_code, store_name, branch_id, NULL::text AS branch_name, regional, area, address,
        pic_name, contact_number, is_active, source, archived_at;
    `,
    {
      replacements: {
        ...data,
        userId: userId || null,
        rawPayload: JSON.stringify({ source: "manual" }),
      },
      type: Sequelize.QueryTypes.SELECT,
    }
  );
  return rows[0] ? mapStoreRow(rows[0]) : null;
}

async function updateManualStore(storeCode, data, userId) {
  const rows = await sequelize.query(
    `
      UPDATE data_stores
      SET
        store_name = COALESCE(:storeName, store_name),
        branch_id = COALESCE(:branchId, branch_id),
        area = COALESCE(:area, area),
        regional = COALESCE(:regional, regional),
        address = COALESCE(:address, address),
        pic_name = COALESCE(:picName, pic_name),
        contact_number = COALESCE(:phone, contact_number),
        is_active = COALESCE(:isActive, is_active),
        source = 'manual',
        manual_updated_at = NOW(),
        manual_updated_by = :userId,
        archived_at = CASE WHEN COALESCE(:isActive, is_active) = TRUE THEN NULL ELSE archived_at END
      WHERE store_code = :storeCode
      RETURNING store_code, store_name, branch_id, NULL::text AS branch_name, regional, area, address,
        pic_name, contact_number, is_active, source, archived_at;
    `,
    {
      replacements: { ...data, storeCode, userId: userId || null },
      type: Sequelize.QueryTypes.SELECT,
    }
  );
  return rows[0] ? mapStoreRow(rows[0]) : null;
}

async function archiveManualStore(storeCode, userId) {
  const rows = await sequelize.query(
    `
      UPDATE data_stores
      SET is_active = FALSE,
          archived_at = NOW(),
          source = 'manual',
          manual_updated_at = NOW(),
          manual_updated_by = :userId
      WHERE store_code = :storeCode
      RETURNING store_code, store_name, branch_id, NULL::text AS branch_name, regional, area, address,
        pic_name, contact_number, is_active, source, archived_at;
    `,
    {
      replacements: { storeCode, userId: userId || null },
      type: Sequelize.QueryTypes.SELECT,
    }
  );
  return rows[0] ? mapStoreRow(rows[0]) : null;
}

async function insertManualEmployee(data, userId) {
  const rows = await sequelize.query(
    `
      INSERT INTO data_employees (
        nik, full_name, job_name, branch_id, store_code, branch_name, store_name, status,
        source, manual_created_at, manual_updated_at, manual_updated_by, last_synced_at, raw_payload
      )
      VALUES (
        :nik, :fullName, :role, :branchId, :storeCode, :branchName, :storeName, 'ACTIVE',
        'manual', NOW(), NOW(), :userId, NOW(), CAST(:rawPayload AS JSONB)
      )
      ON CONFLICT (nik) DO NOTHING
      RETURNING nik, full_name, job_name, branch_id, branch_name, store_code, store_name, status,
        source, last_synced_at, raw_payload;
    `,
    {
      replacements: {
        ...data,
        userId: userId || null,
        rawPayload: JSON.stringify({ source: "manual" }),
      },
      type: Sequelize.QueryTypes.SELECT,
    }
  );
  return rows[0] ? mapEmployeeRow(rows[0]) : null;
}

async function updateManualEmployee(nik, data, userId) {
  const rows = await sequelize.query(
    `
      UPDATE data_employees
      SET
        full_name = COALESCE(:fullName, full_name),
        job_name = COALESCE(:role, job_name),
        branch_id = COALESCE(:branchId, branch_id),
        store_code = COALESCE(:storeCode, store_code),
        branch_name = COALESCE(:branchName, branch_name),
        store_name = COALESCE(:storeName, store_name),
        status = COALESCE(:status, status),
        source = 'manual',
        manual_updated_at = NOW(),
        manual_updated_by = :userId,
        archived_at = CASE WHEN COALESCE(:status, status) = 'ACTIVE' THEN NULL ELSE archived_at END
      WHERE nik = :nik
      RETURNING nik, full_name, job_name, branch_id, branch_name, store_code, store_name, status,
        source, last_synced_at, raw_payload;
    `,
    {
      replacements: { ...data, nik, userId: userId || null },
      type: Sequelize.QueryTypes.SELECT,
    }
  );
  return rows[0] ? mapEmployeeRow(rows[0]) : null;
}

async function archiveManualEmployee(nik, userId) {
  const rows = await sequelize.query(
    `
      UPDATE data_employees
      SET status = 'INACTIVE',
          archived_at = NOW(),
          source = 'manual',
          manual_updated_at = NOW(),
          manual_updated_by = :userId
      WHERE nik = :nik
      RETURNING nik, full_name, job_name, branch_id, branch_name, store_code, store_name, status,
        source, last_synced_at, raw_payload;
    `,
    {
      replacements: { nik, userId: userId || null },
      type: Sequelize.QueryTypes.SELECT,
    }
  );
  return rows[0] ? mapEmployeeRow(rows[0]) : null;
}

module.exports = {
  fetchEodHistoryByRecordedDate,
  fetchEodCurrent,
  fetchEmployeesAll,
  fetchStoresCount,
  fetchStoresAll,
  insertManualStore,
  updateManualStore,
  archiveManualStore,
  insertManualEmployee,
  updateManualEmployee,
  archiveManualEmployee,
};
