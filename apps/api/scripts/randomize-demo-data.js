#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

const db = require("../models");
const ensureDb = require("../utils/ensureDb");
const { BRANCHES } = require("../services/dataClient");
const { toWibDate } = require("../utils/time");
const {
  upsertStores,
  upsertEodCurrent,
  upsertEodHistory,
  upsertEmployees,
} = require("../services/dataPersist");

const backupDir = path.resolve(__dirname, "../../../", process.env.BACKUP_DIR || "backups");
const SYNC_BUCKET_MINUTES = 10;

const AREAS = ["Zone Alpha", "Zone Beta", "Zone Gamma", "Zone Delta", "Zone Epsilon"];
const REGIONALS = ["Region Alpha", "Region Beta", "Region Gamma", "Region Delta"];
const JOB_TITLES = [
  "Store Manager",
  "Assistant Manager",
  "Shift Supervisor",
  "Cashier",
  "Inventory Staff",
  "Merchandiser",
  "Operations Lead",
];

const EOD_MESSAGES = {
  done: [
    "Daily EOD completed and uploaded",
    "Store data synced successfully",
    "Close-out processed without issues",
  ],
  pending: [
    "Awaiting upload confirmation from branch",
    "EOD in progress and waiting for final packet",
    "Sync window still open for final upload",
  ],
  failed: [
    "Upload deadline missed, retry queued",
    "Branch reported a sync failure",
    "No valid EOD packet received before cutoff",
  ],
};

const SYSTEM_COMPONENTS = ["API", "DATABASE", "SCHEDULER", "BACKUP SERVICE", "BOT SERVICE"];
const SYSTEM_INFO_MESSAGES = [
  "Demo data reseed completed",
  "Snapshot tables refreshed successfully",
  "Background sync finished normally",
  "Backup inventory updated",
  "Dashboard snapshot rebuilt from seed data",
];
const SYSTEM_WARNING_MESSAGES = [
  "One branch reported a delayed sync packet",
  "Retry queue still contains stale store updates",
  "Backup rotation completed with a short delay",
  "Scheduler lag detected during the last polling cycle",
];
const SYSTEM_ERROR_MESSAGES = [
  "Temporary store sync failure detected",
  "One branch upload returned an error payload",
  "Background poll retried after a timeout",
];

const AGENT_STATUS_POOL = [
  { status: "up_to_date", weight: 40, message: "Agent is synced" },
  { status: "online", weight: 22, message: "Heartbeat stable" },
  { status: "checking", weight: 10, message: "Polling internal API" },
  { status: "waiting", weight: 8, message: "Queued for rollout" },
  { status: "need_update", weight: 8, message: "Update pending approval" },
  { status: "downloading", weight: 5, message: "Downloading update package" },
  { status: "updating", weight: 4, message: "Applying update and restarting" },
  { status: "error", weight: 3, message: "Last poll failed" },
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chance(probability) {
  return Math.random() < probability;
}

function pick(values) {
  return values[randInt(0, values.length - 1)];
}

function titleCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function offsetDate({ days = 0, hours = 0, minutes = 0 } = {}) {
  return new Date(
    Date.now() - days * 24 * 60 * 60 * 1000 - hours * 60 * 60 * 1000 - minutes * 60 * 1000
  );
}

function floorToBucket(date, bucketMinutes = SYNC_BUCKET_MINUTES) {
  const bucketMs = bucketMinutes * 60 * 1000;
  return new Date(Math.floor(new Date(date).getTime() / bucketMs) * bucketMs);
}

function formatStamp(date) {
  const d = new Date(date);
  const pad = (value) => String(value).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
}

function phoneNumberFor(storeCode) {
  const suffix = String(storeCode).slice(-7).padStart(7, "0");
  return `000-000-${suffix}`;
}

function weightedPick(entries) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = Math.random() * total;
  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry;
  }
  return entries[entries.length - 1];
}

function buildEodOutcome({ history = false } = {}) {
  const roll = Math.random();
  if (history) {
    if (roll < 0.88) return "done";
    if (roll < 0.97) return "pending";
    return "failed";
  }

  if (roll < 0.7) return "done";
  if (roll < 0.9) return "pending";
  return "failed";
}

function buildEodRecord(store, { dayOffset = 0, history = false } = {}) {
  const outcome = buildEodOutcome({ history });
  const businessDate = toWibDate(offsetDate({ days: dayOffset }));
  const eodAt = offsetDate({ days: dayOffset, hours: 1, minutes: randInt(10, 180) });
  const uploadAt = offsetDate({ days: dayOffset, minutes: randInt(10, 120) });
  const sourceSyncedAt = offsetDate({ days: dayOffset, minutes: randInt(5, 90) });
  const maxUploadAt =
    outcome === "pending"
      ? offsetDate({ days: dayOffset, minutes: -randInt(20, 150) })
      : outcome === "failed"
        ? offsetDate({ days: dayOffset, minutes: randInt(20, 150) })
        : offsetDate({ days: dayOffset, minutes: randInt(30, 180) });
  const uploadPercent =
    outcome === "done" ? 100 : outcome === "pending" ? randInt(25, 96) : randInt(0, 85);
  const statusSales = outcome === "done" ? "Ok" : outcome === "pending" ? "Process" : "Failed";

  return {
    storeCode: store.storeCode,
    storeName: store.storeName,
    branchId: store.branchId,
    branchName: store.branchName,
    area: store.area,
    regional: store.regional,
    nikAc: store.nikAc,
    nikRh: store.nikRh,
    businessDate,
    statusSales,
    uploadPercent,
    eodAt,
    uploadAt,
    maxUploadAt,
    sourceSyncedAt,
    raw: {
      kodetoko: store.storeCode,
      namatoko: store.storeName,
      branch_id: store.branchId,
      branch_name: store.branchName,
      area: store.area,
      regional: store.regional,
      statussales: statusSales,
      persentaseuploadstok: uploadPercent,
      eod_at: eodAt.toISOString(),
      upload_at: uploadAt.toISOString(),
      max_upload_at: maxUploadAt.toISOString(),
      business_date: businessDate,
      source_synced_at: sourceSyncedAt.toISOString(),
    },
  };
}

let globalStoreIndex = 100000;
let globalEmployeeIndex = 1;

function buildEmployeesForStore(store, employeeCount) {
  const employees = [];

  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const datePrefix = `${yy}${mm}${dd}`;

  for (let index = 0; index < employeeCount; index += 1) {
    const fullName = `Demo Employee ${store.storeCode}-${String(index + 1).padStart(2, "0")}`;

    // NIK Format: YYMMDD + global sequential ID
    const nik = `${datePrefix}${String(globalEmployeeIndex).padStart(4, "0")}`;
    globalEmployeeIndex++;

    const jobName = pick(JOB_TITLES);
    const lastActivity = offsetDate({ hours: randInt(0, 72), minutes: randInt(0, 59) });

    employees.push({
      empid: nik,
      name: fullName,
      jobName,
      branchId: store.branchId,
      storeCode: store.storeCode,
      branchName: store.branchName,
      storeName: store.storeName,
      raw: {
        nik,
        full_name: fullName,
        job_name: jobName,
        branch_id: store.branchId,
        branch_name: store.branchName,
        store_code: store.storeCode,
        store_name: store.storeName,
        last_activity: lastActivity.toISOString(),
        status: "ACTIVE",
      },
      model: {
        nik,
        full_name: fullName,
        role: jobName,
        store_code: String(store.storeCode),
        status: "ACTIVE",
        last_activity: lastActivity,
      },
    });
  }

  return employees;
}

function buildStoreBlueprint(branch, ordinal) {
  globalStoreIndex++;
  const storeCode = globalStoreIndex;
  const storeName = `Demo Retail Store ${storeCode}`;
  const branchName = branch.name;
  const area = `${pick(AREAS)} ${titleCase(branch.name)}`;
  const regional = pick(REGIONALS);
  const lastSeenAt = offsetDate({ hours: randInt(1, 24), minutes: randInt(0, 59) });
  const lastSyncAt = offsetDate({ minutes: randInt(5, 120) });
  const currentEod = buildEodRecord(
    {
      storeCode,
      storeName,
      branchId: branch.id,
      branchName,
      area,
      regional,
      nikAc: `AC${storeCode}`,
      nikRh: `RH${storeCode}`,
    },
    { dayOffset: 0, history: false }
  );
  const employeeCount = randInt(3, 6);
  const agent = weightedPick(AGENT_STATUS_POOL);
  const syncStatus =
    currentEod.statusSales === "Failed"
      ? chance(0.5)
        ? "problem"
        : "stale"
      : currentEod.statusSales === "Process"
        ? chance(0.4)
          ? "stale"
          : "synced"
        : chance(0.12)
          ? "stale"
          : "synced";
  const syncAgeMinutes =
    syncStatus === "synced"
      ? randInt(5, 30)
      : syncStatus === "stale"
        ? randInt(45, 180)
        : randInt(180, 420);
  const syncLastSeen = offsetDate({ minutes: syncAgeMinutes });

  const store = {
    storeCode,
    storeName,
    branchId: branch.id,
    branchName,
    area,
    regional,
    nikAc: `AC${storeCode}`,
    nikRh: `RH${storeCode}`,
    ordinal,
    lastSeenAt,
    lastSyncAt,
    syncStatus,
    syncAgeMinutes,
    syncLastSeen,
    currentEod,
    employeeCount,
    agentStatus: agent.status,
    agentMessage: agent.message,
  };

  store.employees = buildEmployeesForStore(store, employeeCount);
  store.picName = store.employees[0]?.name || null;
  store.address = `Demo Street ${String(ordinal).padStart(3, "0")}, ${titleCase(regional)}`;
  store.contactNumber = phoneNumberFor(storeCode);
  store.hostName = `agent-${storeCode}.demo.local`;
  store.version = `2.4.${randInt(0, 9)}`;
  store.workerVersion = `1.8.${randInt(0, 9)}`;
  store.updateRequested =
    store.agentStatus === "need_update" || store.agentStatus === "downloading";
  store.scriptUpdateRequested = store.agentStatus === "updating" || chance(0.1);
  store.lastError =
    store.agentStatus === "error" ? "Heartbeat failed during the latest poll" : null;

  return store;
}

function buildDemoStores() {
  const stores = [];
  for (const branch of BRANCHES) {
    const count = randInt(6, 9);
    for (let ordinal = 1; ordinal <= count; ordinal += 1) {
      stores.push(buildStoreBlueprint(branch, ordinal));
    }
  }
  return stores;
}

function buildHistoryRows(store, historyDays = 7) {
  const rowsByDate = new Map();

  for (let dayOffset = 0; dayOffset < historyDays; dayOffset += 1) {
    const record = buildEodRecord(store, { dayOffset, history: dayOffset > 0 });
    const dateKey = record.businessDate;
    if (!rowsByDate.has(dateKey)) rowsByDate.set(dateKey, []);
    rowsByDate.get(dateKey).push(record);
  }

  return rowsByDate;
}

function buildSystemLogs(summary, stores) {
  const logs = [];
  const infoCount = 18;
  const warningCount = 6;
  const errorCount = 3;

  for (let index = 0; index < infoCount; index += 1) {
    const component = pick(SYSTEM_COMPONENTS);
    const store = chance(0.55) ? pick(stores) : null;
    logs.push({
      level: "INFO",
      component,
      message: pick(SYSTEM_INFO_MESSAGES),
      metadata: {
        storesSeeded: summary.stores,
        employeesSeeded: summary.employees,
        storeCode: store?.storeCode || null,
      },
      createdAt: offsetDate({ hours: randInt(0, 18), minutes: randInt(0, 59) }),
    });
  }

  for (let index = 0; index < warningCount; index += 1) {
    const component = pick(SYSTEM_COMPONENTS);
    const store = chance(0.6) ? pick(stores) : null;
    logs.push({
      level: "WARNING",
      component,
      message: pick(SYSTEM_WARNING_MESSAGES),
      metadata: {
        storeCode: store?.storeCode || null,
        syncStatus: store?.syncStatus || null,
      },
      createdAt: offsetDate({ hours: randInt(0, 20), minutes: randInt(0, 59) }),
    });
  }

  for (let index = 0; index < errorCount; index += 1) {
    const component = pick(SYSTEM_COMPONENTS);
    const store = pick(stores);
    logs.push({
      level: "ERROR",
      component,
      message: pick(SYSTEM_ERROR_MESSAGES),
      metadata: {
        storeCode: store?.storeCode || null,
        branchId: store?.branchId || null,
      },
      createdAt: offsetDate({ hours: randInt(0, 22), minutes: randInt(0, 59) }),
    });
  }

  return logs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function buildBackupContent({ label, summary, index }) {
  const stamp = new Date().toISOString();
  const header = [
    "-- Enterprise Ops Monitor demo backup",
    `-- label: ${label}`,
    `-- generated: ${stamp}`,
    `-- stores: ${summary.stores}`,
    `-- employees: ${summary.employees}`,
    `-- EOD done=${summary.done} pending=${summary.pending} failed=${summary.failed}`,
    `-- sync synced=${summary.synced} stale=${summary.stale} problem=${summary.problem}`,
    "",
  ].join("\n");

  const filler = `-- ${label} snapshot ${index + 1} :: ${summary.stores} stores :: ${summary.employees} employees :: ${summary.done} done\n`;
  let content = header;
  while (Buffer.byteLength(content, "utf8") < 180000 + index * 25000) {
    content += filler;
  }

  return content;
}

async function clearDemoBackups() {
  await fs.mkdir(backupDir, { recursive: true });
  const entries = await fs.readdir(backupDir, { withFileTypes: true });
  const removable = entries.filter((entry) => {
    if (!entry.isFile()) return false;
    const lower = entry.name.toLowerCase();
    return (
      (lower.startsWith("scheduled_backup_") || lower.startsWith("manual_backup_")) &&
      (lower.endsWith(".sql") || lower.endsWith(".dump"))
    );
  });

  await Promise.all(
    removable.map((entry) => fs.unlink(path.join(backupDir, entry.name)).catch(() => null))
  );
}

function buildStoreRows(stores) {
  return stores.map((store) => ({
    storeCode: store.storeCode,
    storeName: store.storeName,
    branchId: Number(store.branchId),
    area: store.area,
    regional: store.regional,
    nikAc: store.nikAc,
    nikRh: store.nikRh,
    raw: {
      store_code: store.storeCode,
      store_name: store.storeName,
      branch_id: store.branchId,
      branch_name: store.branchName,
      area: store.area,
      regional: store.regional,
      pic_name: store.picName,
      contact_number: store.contactNumber,
      last_seen_at: store.lastSeenAt.toISOString(),
      last_sync: store.lastSyncAt.toISOString(),
    },
    model: {
      store_code: store.storeCode,
      store_name: store.storeName,
      area: store.area,
      region: store.regional,
      address: store.address,
      pic_name: store.picName,
      contact_number: store.contactNumber,
      is_active: true,
    },
  }));
}

function buildCurrentRows(stores) {
  return stores.map((store) => ({
    ...store.currentEod,
    raw: store.currentEod.raw,
  }));
}

function buildSyncStateRows(stores) {
  const storeSnapshotRows = [];
  const summaryRows = [];
  const latestRows = [];
  const alertRows = [];
  const logRows = [];

  for (const store of stores) {
    const now = new Date();
    const polledAt = offsetDate({ minutes: randInt(0, 5) });
    const summaryBucketCount = 6;

    storeSnapshotRows.push({
      kodetoko: store.storeCode,
      branch_id: String(store.branchId),
      nama_toko: store.storeName,
      last_sync_epoch: Math.floor(store.syncLastSeen.getTime() / 1000),
      age_sec: Math.floor((Date.now() - store.syncLastSeen.getTime()) / 1000),
      status: store.syncStatus,
      updated_at: now,
    });

    latestRows.push({
      kodetoko: store.storeCode,
      branch_id: String(store.branchId),
      nama_toko: store.storeName,
      last_sync_epoch: Math.floor(store.syncLastSeen.getTime() / 1000),
      source_fetched_at: store.syncLastSeen,
      updated_at: now,
    });

    logRows.push({
      store_code: String(store.storeCode),
      store_name: store.storeName,
      branch_id: String(store.branchId),
      branch_name: store.branchName,
      last_sync_at: store.syncLastSeen,
      is_stale: store.syncStatus === "stale",
      is_problem: store.syncStatus === "problem",
      is_missing_today: store.currentEod.statusSales !== "Ok" && store.syncStatus !== "synced",
      polled_at: polledAt,
    });

    if (store.syncStatus !== "synced" || store.currentEod.statusSales !== "Ok") {
      alertRows.push({
        store_code: String(store.storeCode),
        store_name: store.storeName,
        branch_id: String(store.branchId),
        branch_name: store.branchName,
        is_stale: store.syncStatus === "stale",
        is_problem: store.syncStatus === "problem",
        is_missing_today: store.currentEod.statusSales !== "Ok",
        stale_since:
          store.syncStatus === "synced"
            ? null
            : offsetDate({ minutes: store.syncAgeMinutes + randInt(5, 45) }),
        last_seen_at: store.syncLastSeen,
        last_alerted_at: offsetDate({ minutes: randInt(10, 180) }),
        last_recovered_at: store.syncStatus === "synced" ? now : null,
      });
    }

    for (let bucketIndex = 0; bucketIndex < summaryBucketCount; bucketIndex += 1) {
      const bucketStart = floorToBucket(
        offsetDate({ minutes: bucketIndex * SYNC_BUCKET_MINUTES }),
        SYNC_BUCKET_MINUTES
      );
      const bucketAge = bucketIndex * SYNC_BUCKET_MINUTES + randInt(0, 4);
      const bucketStatus =
        bucketIndex === 0
          ? store.syncStatus
          : bucketIndex < 3
            ? store.syncStatus === "problem"
              ? "stale"
              : store.syncStatus
            : chance(0.12)
              ? "stale"
              : "synced";
      const bucketLastSync = offsetDate({ minutes: bucketAge + randInt(0, 8) });

      summaryRows.push({
        store_code: store.storeCode,
        store_name: store.storeName,
        branch_id: String(store.branchId),
        branch_name: store.branchName,
        bucket_start: bucketStart,
        bucket_minutes: SYNC_BUCKET_MINUTES,
        last_sync_at: bucketLastSync,
        is_stale: bucketStatus === "stale",
        is_problem: bucketStatus === "problem",
        is_missing_today: bucketStatus !== "synced" && bucketIndex === 0,
        polled_at: offsetDate({ minutes: bucketAge }),
      });
    }
  }

  return { storeSnapshotRows, summaryRows, latestRows, alertRows, logRows };
}

function buildSummary(stores, currentRows, syncRows) {
  const done = currentRows.filter(
    (row) => row.statusSales === "Ok" && row.uploadPercent >= 100
  ).length;
  const failed = currentRows.filter((row) => row.statusSales === "Failed").length;
  const pending = Math.max(0, stores.length - done - failed);
  const synced = syncRows.logRows.filter((row) => !row.is_stale && !row.is_problem).length;
  const stale = syncRows.logRows.filter((row) => row.is_stale && !row.is_problem).length;
  const problem = syncRows.logRows.filter((row) => row.is_problem).length;

  return {
    stores: stores.length,
    employees: stores.reduce((sum, store) => sum + store.employees.length, 0),
    done,
    pending,
    failed,
    synced,
    stale,
    problem,
  };
}

async function truncateTables(transaction) {
  await Promise.all([
    db.Store?.destroy({
      where: {},
      truncate: true,
      cascade: true,
      restartIdentity: true,
      transaction,
    }),
    db.Employee?.destroy({
      where: {},
      truncate: true,
      cascade: true,
      restartIdentity: true,
      transaction,
    }),
    db.EODLog?.destroy({
      where: {},
      truncate: true,
      cascade: true,
      restartIdentity: true,
      transaction,
    }),
    db.BackupLog?.destroy({
      where: {},
      truncate: true,
      cascade: true,
      restartIdentity: true,
      transaction,
    }),
    db.SystemLog?.destroy({
      where: {},
      truncate: true,
      cascade: true,
      restartIdentity: true,
      transaction,
    }),
    db.AgentMonitoring?.destroy({
      where: {},
      truncate: true,
      cascade: true,
      restartIdentity: true,
      transaction,
    }),
    db.SyncAlertState?.destroy({
      where: {},
      truncate: true,
      cascade: true,
      restartIdentity: true,
      transaction,
    }),
    db.SyncLog?.destroy({
      where: {},
      truncate: true,
      cascade: true,
      restartIdentity: true,
      transaction,
    }),
    db.SyncSummary?.destroy({
      where: {},
      truncate: true,
      cascade: true,
      restartIdentity: true,
      transaction,
    }),
  ]);

  await db.sequelize.query(
    `
      TRUNCATE TABLE
        data_stores,
        data_store_eod_current,
        data_store_eod_history,
        data_employees,
        stores_master,
        store_sync_snapshot,
        sync_aud_latest,
        service_heartbeats,
        afterhours_pc_log,
        afterhours_monthly_report
      RESTART IDENTITY CASCADE;
    `,
    { transaction }
  );
}

async function seedStoreSyncTables(syncRows, transaction) {
  const { storeSnapshotRows, summaryRows, latestRows, alertRows, logRows } = syncRows;

  await db.sequelize.query(
    `
      INSERT INTO store_sync_snapshot (
        kodetoko,
        branch_id,
        nama_toko,
        last_sync_epoch,
        age_sec,
        status,
        updated_at
      )
      SELECT * FROM UNNEST(
        $1::bigint[],
        $2::text[],
        $3::text[],
        $4::bigint[],
        $5::int[],
        $6::text[],
        $7::timestamptz[]
      )
      ON CONFLICT (kodetoko) DO UPDATE SET
        branch_id = EXCLUDED.branch_id,
        nama_toko = EXCLUDED.nama_toko,
        last_sync_epoch = EXCLUDED.last_sync_epoch,
        age_sec = EXCLUDED.age_sec,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at;
    `,
    {
      bind: [
        storeSnapshotRows.map((row) => row.kodetoko),
        storeSnapshotRows.map((row) => row.branch_id),
        storeSnapshotRows.map((row) => row.nama_toko),
        storeSnapshotRows.map((row) => row.last_sync_epoch),
        storeSnapshotRows.map((row) => row.age_sec),
        storeSnapshotRows.map((row) => row.status),
        storeSnapshotRows.map((row) => row.updated_at),
      ],
      transaction,
    }
  );

  await db.sequelize.query(
    `
      INSERT INTO sync_aud_latest (
        kodetoko,
        branch_id,
        nama_toko,
        last_sync_epoch,
        source_fetched_at,
        updated_at
      )
      SELECT * FROM UNNEST(
        $1::bigint[],
        $2::text[],
        $3::text[],
        $4::bigint[],
        $5::timestamptz[],
        $6::timestamptz[]
      )
      ON CONFLICT (kodetoko) DO UPDATE SET
        branch_id = EXCLUDED.branch_id,
        nama_toko = COALESCE(EXCLUDED.nama_toko, sync_aud_latest.nama_toko),
        last_sync_epoch = EXCLUDED.last_sync_epoch,
        source_fetched_at = EXCLUDED.source_fetched_at,
        updated_at = EXCLUDED.updated_at;
    `,
    {
      bind: [
        latestRows.map((row) => row.kodetoko),
        latestRows.map((row) => row.branch_id),
        latestRows.map((row) => row.nama_toko),
        latestRows.map((row) => row.last_sync_epoch),
        latestRows.map((row) => row.source_fetched_at),
        latestRows.map((row) => row.updated_at),
      ],
      transaction,
    }
  );

  await db.SyncLog.bulkCreate(logRows, { transaction });
  await db.SyncSummary.bulkCreate(summaryRows, {
    transaction,
    updateOnDuplicate: [
      "store_name",
      "branch_id",
      "branch_name",
      "last_sync_at",
      "is_stale",
      "is_problem",
      "is_missing_today",
      "polled_at",
      "bucket_minutes",
    ],
  });

  if (alertRows.length > 0) {
    await db.SyncAlertState.bulkCreate(alertRows, {
      transaction,
      updateOnDuplicate: [
        "store_name",
        "branch_id",
        "branch_name",
        "is_stale",
        "is_problem",
        "is_missing_today",
        "stale_since",
        "last_seen_at",
        "last_alerted_at",
        "last_recovered_at",
      ],
    });
  }
}

async function seedServiceHeartbeats(transaction) {
  const rows = [
    { service_name: "api", last_seen_at: offsetDate({ minutes: 2 }) },
    { service_name: "scheduler", last_seen_at: offsetDate({ minutes: 32 }) },
    { service_name: "backup", last_seen_at: offsetDate({ hours: 3 }) },
  ];

  for (const row of rows) {
    await db.sequelize.query(
      `
        INSERT INTO service_heartbeats (service_name, last_seen_at, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (service_name)
        DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at, updated_at = NOW();
      `,
      { bind: [row.service_name, row.last_seen_at], transaction }
    );
  }
}

async function writeDemoBackups(summary) {
  await clearDemoBackups();

  const backups = [];
  for (let index = 0; index < 5; index += 1) {
    const isScheduled = index % 2 === 0;
    const createdAt = offsetDate({ days: index, hours: randInt(0, 2), minutes: randInt(0, 45) });
    const fileName = `${isScheduled ? "scheduled" : "manual"}_backup_${formatStamp(createdAt)}.sql`;
    const fullPath = path.join(backupDir, fileName);
    const content = buildBackupContent({
      label: isScheduled ? "scheduled" : "manual",
      summary,
      index,
    });

    await fs.writeFile(fullPath, content, "utf8");
    await fs.utimes(fullPath, createdAt, createdAt);

    const stat = await fs.stat(fullPath);
    backups.push({
      filename: fileName,
      type: isScheduled ? "SCHEDULED" : "MANUAL",
      size_bytes: stat.size,
      status: "SUCCESS",
      message: `${isScheduled ? "Scheduled" : "Manual"} demo backup completed successfully`,
      created_at: createdAt,
      filePath: fullPath,
    });
  }

  return backups;
}

async function seedDemoData() {
  await db.sequelize.authenticate();
  await db.sequelize.sync({ alter: true });
  await ensureDb(db);

  const stores = buildDemoStores();
  const storeRows = buildStoreRows(stores);
  const currentRows = buildCurrentRows(stores);
  const historyByDate = new Map();

  for (const store of stores) {
    const storeHistory = buildHistoryRows(store, 7);
    for (const [dateKey, rows] of storeHistory.entries()) {
      if (!historyByDate.has(dateKey)) historyByDate.set(dateKey, []);
      historyByDate.get(dateKey).push(...rows);
    }
  }

  const syncRows = buildSyncStateRows(stores);
  const summary = buildSummary(stores, currentRows, syncRows);
  const backupRows = await writeDemoBackups(summary);
  const systemLogs = buildSystemLogs(summary, stores);
  const eodLogs = [];

  for (const [dateKey, rows] of historyByDate.entries()) {
    for (const row of rows) {
      eodLogs.push({
        store_code: String(row.storeCode),
        date: dateKey,
        status:
          row.statusSales === "Ok" ? "DONE" : row.statusSales === "Process" ? "PENDING" : "FAILED",
        message: pick(
          EOD_MESSAGES[
            row.statusSales === "Ok" ? "done" : row.statusSales === "Process" ? "pending" : "failed"
          ]
        ),
        source: row.statusSales === "Ok" ? "API" : row.statusSales === "Process" ? "BOT" : "MANUAL",
        synced_at: row.sourceSyncedAt,
      });
    }
  }

  const storeModelRows = storeRows.map((row) => row.model);
  const employeeModelRows = stores.flatMap((store) =>
    store.employees.map((employee) => employee.model)
  );
  const employeeRows = stores.flatMap((store) => store.employees.map((employee) => employee));

  await db.sequelize.transaction(async (transaction) => {
    await truncateTables(transaction);

    await db.Store.bulkCreate(storeModelRows, { transaction });
    await db.Employee.bulkCreate(employeeModelRows, { transaction });
    await db.EODLog.bulkCreate(eodLogs, { transaction });
    await db.BackupLog.bulkCreate(backupRows, { transaction });
    await db.SystemLog.bulkCreate(systemLogs, { transaction });
    await db.AgentMonitoring.bulkCreate(
      stores.map((store) => ({
        store_id: String(store.storeCode),
        hostname: store.hostName,
        version: store.version,
        last_check_at: offsetDate({ minutes: randInt(0, 12) }),
        status_message: store.agentMessage,
        last_error: store.lastError,
        update_requested: store.updateRequested,
        script_update_requested: store.scriptUpdateRequested,
        worker_version: store.workerVersion,
        agent_status: store.agentStatus,
      })),
      { transaction }
    );

    await upsertStores(
      storeRows.map((row) => ({
        storeCode: row.storeCode,
        storeName: row.storeName,
        branchId: row.branchId,
        area: row.area,
        regional: row.regional,
        nikAc: row.nikAc,
        nikRh: row.nikRh,
        raw: row.raw,
      })),
      { transaction }
    );

    await upsertEodCurrent(
      currentRows.map((row) => ({
        storeCode: row.storeCode,
        businessDate: row.businessDate,
        statusSales: row.statusSales,
        uploadPercent: row.uploadPercent,
        eodAt: row.eodAt,
        uploadAt: row.uploadAt,
        maxUploadAt: row.maxUploadAt,
        raw: row.raw,
      })),
      { transaction }
    );

    for (const [dateKey, rows] of historyByDate.entries()) {
      await upsertEodHistory(
        rows.map((row) => ({
          storeCode: row.storeCode,
          businessDate: row.businessDate,
          statusSales: row.statusSales,
          uploadPercent: row.uploadPercent,
          eodAt: row.eodAt,
          uploadAt: row.uploadAt,
          maxUploadAt: row.maxUploadAt,
          raw: row.raw,
        })),
        dateKey,
        { transaction }
      );
    }

    await upsertEmployees(employeeRows, { transaction });
    await seedStoreSyncTables(syncRows, transaction);
    await seedServiceHeartbeats(transaction);
  });

  return {
    summary,
    backupRows,
    storeCount: stores.length,
    employeeCount: employeeRows.length,
    eodCount: eodLogs.length,
    backupCount: backupRows.length,
    systemLogCount: systemLogs.length,
    syncSnapshotCount: syncRows.storeSnapshotRows.length,
    syncSummaryCount: syncRows.summaryRows.length,
    syncAlertCount: syncRows.alertRows.length,
  };
}

async function main() {
  try {
    const result = await seedDemoData();
    console.log(
      `[randomize-demo-data] Seeded ${result.storeCount} stores, ${result.employeeCount} employees, ${result.eodCount} EOD logs, ${result.backupCount} backups, ${result.systemLogCount} system logs.`
    );
    console.log(
      `[randomize-demo-data] Sync snapshots: ${result.syncSnapshotCount}, summary buckets: ${result.syncSummaryCount}, sync alerts: ${result.syncAlertCount}.`
    );
    console.log(`[randomize-demo-data] Demo backups written to ${backupDir}`);
  } catch (error) {
    console.error("[randomize-demo-data] Failed to seed demo data:", error);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close().catch(() => null);
  }
}

if (require.main === module) {
  main();
}
