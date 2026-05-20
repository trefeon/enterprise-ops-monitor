const express = require("express");
const cors = require("cors");
const { faker } = require("@faker-js/faker");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.MOCK_API_PORT || 4000;
const WIB_OFFSET = 7 * 60 * 60 * 1000; // +07:00

// ─── Helpers ───────────────────────────────────────────────────────────────────
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomWeighted(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function toWibDate(date) {
  const d = date || new Date();
  const wib = new Date(d.getTime() + WIB_OFFSET);
  return wib.toISOString().slice(0, 10);
}

function toWibIso(date) {
  const d = date || new Date();
  const wib = new Date(d.getTime() + WIB_OFFSET);
  return wib.toISOString().replace("Z", "+07:00");
}

function nowWib() {
  return new Date(Date.now() + WIB_OFFSET);
}

function wibHour() {
  const wib = nowWib();
  return wib.getUTCHours();
}

function wibMinute() {
  const wib = nowWib();
  return wib.getUTCMinutes();
}

function daysAgo(n) {
  const d = new Date(Date.now() - n * 86400000);
  return d;
}

function randomPastMinutes(maxMinutes, baseDate) {
  const origin = baseDate || new Date();
  return new Date(origin.getTime() - randomInt(0, maxMinutes * 60000)).toISOString();
}

function randomTimeInWindow(hourStart, hourEnd, date) {
  const d = date ? new Date(date) : new Date();
  d.setUTCHours(randomInt(hourStart, hourEnd - 1), randomInt(0, 59), randomInt(0, 59), 0);
  return d;
}

function ok(res, data, meta) {
  res.json({ ok: true, data, meta: meta || null });
}

function fail(res, status, code, message) {
  res.status(status).json({
    ok: false,
    data: null,
    meta: null,
    error: { code, message },
  });
}

function paginate(items, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(query.pageSize, 10) || 50));
  const total = items.length;
  const offset = (page - 1) * pageSize;
  const paged = items.slice(offset, offset + pageSize);
  return {
    data: paged,
    meta: {
      pagination: { page, pageSize, total },
      timezone: "Asia/Jakarta",
    },
  };
}

// ─── Branch & Store Data (synthetic portfolio demo IDs) ─────────────────────────
const BRANCHES = [
  { id: "2", code: "H02", name: "NORTH HUB", region: "Alpha" },
  { id: "3", code: "H03", name: "EAST HUB", region: "Alpha" },
  { id: "4", code: "H04", name: "CENTRAL HUB", region: "Beta" },
  { id: "5", code: "H05", name: "COASTAL HUB", region: "Beta" },
  { id: "6", code: "H06", name: "HIGHLAND HUB", region: "Gamma" },
  { id: "7", code: "H07", name: "WEST HUB", region: "Gamma" },
  { id: "8", code: "H08", name: "RIVER HUB", region: "Delta" },
  { id: "9", code: "H09", name: "SOUTH HUB", region: "Delta" },
];

// Generate unique random store codes (alphanumeric, e.g. ST-A7K2M)
const USED_STORE_CODES = new Set();

function buildDemoStoreCode() {
  let code;
  do {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    code = 'ST-' +
      letters[randomInt(0, letters.length - 1)] +
      String(randomInt(0, 9)) +
      letters[randomInt(0, letters.length - 1)] +
      String(randomInt(0, 9)) +
      letters[randomInt(0, letters.length - 1)];
  } while (USED_STORE_CODES.has(code));
  USED_STORE_CODES.add(code);
  return code;
}

function buildStores() {
  const stores = [];
  let globalIdx = 1;
  for (const branch of BRANCHES) {
    const storeCount = randomInt(3, 6);
    for (let s = 0; s < storeCount; s++) {
      const storeCode = buildDemoStoreCode();
      stores.push({
        id: storeCode,
        storeCode,
        storeName: `${faker.company.name()} ${storeCode}`,
        branchId: branch.id,
        branchName: branch.name,
        region: branch.region,
        area: branch.region,
        regional: branch.region,
        city: `${faker.location.city()}`,
        address: `${faker.location.streetAddress()}`,
        phone: `+62-812-${String(randomInt(1000, 9999))}-${String(randomInt(1000, 9999))}`,
        picName: `${faker.person.firstName()} ${faker.person.lastName()}`,
        status: "active",
        employeeCount: randomInt(15, 40),
        openingDate: faker.date.past({ years: 5 }).toISOString().slice(0, 10),
        isActive: true,
      });
      globalIdx++;
    }
  }
  return stores;
}

const STORES = buildStores();

// ─── Time-aware EOD Status Generator ──────────────────────────────────────────
const EOD_STATUSES = ["done", "pending", "failed"];

function generateEodStatus() {
  const hour = wibHour();
  const min = wibMinute();
  let idx;

  // Before 19:00 WIB — new business day, mostly pending
  if (hour < 19) {
    idx = randomWeighted([5, 90, 5]); // ~5% done, 90% pending, 5% failed
  } else if (hour === 19 && min < 30) {
    idx = randomWeighted([15, 80, 5]);
  } else if (hour < 21) {
    idx = randomWeighted([50, 40, 10]);
  } else if (hour < 23) {
    idx = randomWeighted([75, 12, 13]);
  } else {
    idx = randomWeighted([82, 5, 13]);
  }
  return EOD_STATUSES[idx];
}

function generateHistoricalStatus(daysAgo) {
  // Older data is more likely to be "done" (retrospectively completed)
  let idx;
  if (daysAgo > 7) idx = randomWeighted([90, 3, 7]);
  else if (daysAgo > 2) idx = randomWeighted([80, 8, 12]);
  else idx = randomWeighted([70, 15, 15]);
  return EOD_STATUSES[idx];
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
function buildDashboardSummary() {
  const today = toWibDate();
  const eodRows = STORES.map((s) => ({
    storeCode: s.storeCode,
    storeName: s.storeName,
    branchId: s.branchId,
    branchName: s.branchName,
    status: generateEodStatus(),
    lastSyncAt: randomPastMinutes(15),
    uploadAt: randomPastMinutes(60),
    eodAt: randomPastMinutes(120),
  }));

  let completed = 0;
  let failed = 0;
  let lastSyncAt = null;
  for (const row of eodRows) {
    if (row.status === "done") completed++;
    else if (row.status === "failed") failed++;
    if (!lastSyncAt || row.lastSyncAt > lastSyncAt) lastSyncAt = row.lastSyncAt;
  }
  const pending = STORES.length - completed - failed;

  const employeeCount = STORES.reduce((sum) => sum + randomInt(15, 25), 0);
  const backupCount = randomInt(8, 15);
  const latestBackup = new Date(Date.now() - randomInt(0, 3600000));
  const failedEodCount = failed;
  const criticalErrors = failedEodCount > 0 ? randomInt(1, 3) : 0;

  let systemHealth = "OK";
  if (criticalErrors > 2) systemHealth = "CRITICAL";
  else if (criticalErrors > 0 || failedEodCount > 3) systemHealth = "WARNING";

  return {
    storesTotal: STORES.length,
    eod: {
      date: today,
      done: completed,
      pending,
      failed,
      lastSyncAt: toWibIso(new Date(lastSyncAt)),
    },
    interactionsToday: randomInt(20, 150),
    backups: {
      available: backupCount,
      latestAt: toWibIso(latestBackup),
    },
    employees: {
      total: employeeCount,
      branches: BRANCHES.length,
      syncedAt: toWibIso(new Date(Date.now() - randomInt(0, 600000))),
    },
    systemHealth,
  };
}

function buildDashboardAlerts() {
  const alerts = [];
  const hour = wibHour();

  // EOD failure alerts (derived from current state)
  const failedCount = STORES.filter(() => {
    return generateEodStatus() === "failed";
  }).length;

  if (failedCount > 0) {
    alerts.push({
      id: `eod_failed_${Date.now()}`,
      type: "EOD_FAILED",
      severity: failedCount > 3 ? "HIGH" : "MEDIUM",
      title: `${failedCount} stores failed EOD`,
      createdAt: toWibIso(new Date()),
    });
  }

  // Late EOD (during window hours)
  if (hour >= 21) {
    const lateCount = STORES.filter(() => generateEodStatus() === "pending").length;
    if (lateCount > 0) {
      alerts.push({
        id: `eod_late_${Date.now()}`,
        type: "EOD_MISSED",
        severity: lateCount > 3 ? "MEDIUM" : "LOW",
        title: `${lateCount} stores have not submitted EOD`,
        createdAt: toWibIso(new Date()),
      });
    }
  }

  // Random service/backup alerts (occasional)
  if (Math.random() > 0.6) {
    alerts.push({
      id: `backup_${Date.now()}`,
      type: "BACKUP_FAILED",
      severity: "HIGH",
      title: "Scheduled backup did not complete",
      createdAt: toWibIso(new Date(Date.now() - randomInt(0, 86400000))),
    });
  }

  if (Math.random() > 0.8) {
    alerts.push({
      id: `disk_${Date.now()}`,
      type: "DISK_LOW",
      severity: "MEDIUM",
      title: "Disk usage above 85% on eom-db",
      createdAt: toWibIso(new Date(Date.now() - randomInt(0, 3600000))),
    });
  }

  if (Math.random() > 0.85) {
    alerts.push({
      id: `service_${Date.now()}`,
      type: "SERVICE_DOWN",
      severity: "HIGH",
      title: "Notification service unreachable",
      createdAt: toWibIso(new Date(Date.now() - randomInt(0, 600000))),
    });
  }

  return alerts.slice(0, 10);
}

// ─── EOD /eod/* ────────────────────────────────────────────────────────────────
function buildEodStoreRows(filterDate) {
  const targetDate = filterDate || toWibDate();
  const isToday = targetDate === toWibDate();
  const daysAgoDiff = targetDate
    ? Math.round((Date.now() - new Date(targetDate).getTime()) / 86400000)
    : 0;

  return STORES.map((store) => {
    const status = isToday ? generateEodStatus() : generateHistoricalStatus(daysAgoDiff);
    const isDone = status === "done";
    const eodAt = isDone
      ? randomTimeInWindow(19, 23, new Date(targetDate))
      : null;
    const syncAt = isDone
      ? eodAt
      : randomTimeInWindow(6, 23, new Date(targetDate));

    return {
      storeId: Number(store.storeCode),
      storeCode: store.storeCode,
      storeName: store.storeName,
      areaId: store.branchId,
      areaName: store.branchName,
      status,
      lastEodAt: eodAt ? toWibIso(eodAt) : null,
      lastSyncAt: syncAt ? toWibIso(syncAt) : null,
      source: isToday ? (Math.random() > 0.3 ? "api" : "bot") : "db",
      errorMessage: status === "failed" ? "EOD not completed by deadline" : null,
    };
  });
}

function buildEodAreas(eodRows) {
  const stats = new Map();
  for (const row of eodRows) {
    const areaId = row.areaId || "UNKNOWN";
    const areaName = row.areaName || areaId;
    if (!stats.has(areaId)) {
      stats.set(areaId, { areaId, areaName, storesTotal: 0, done: 0, pending: 0, failed: 0 });
    }
    const s = stats.get(areaId);
    s.storesTotal += 1;
    if (row.status === "done") s.done += 1;
    else if (row.status === "failed") s.failed += 1;
    else s.pending += 1;
  }
  return Array.from(stats.values()).map((row) => ({
    ...row,
    completionRate: row.storesTotal > 0 ? +(row.done / row.storesTotal).toFixed(2) : 0,
  }));
}

function buildEodTrend(days) {
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = daysAgo(i);
    const dateKey = toWibDate(date);
    const dayStatuses = STORES.map(() => generateHistoricalStatus(i));
    const done = dayStatuses.filter((s) => s === "done").length;
    const failed = dayStatuses.filter((s) => s === "failed").length;
    const pending = STORES.length - done - failed;
    data.push({ date: dateKey, done, failed, pending, total: STORES.length });
  }
  return data;
}

function buildEodRanking() {
  const ranked = STORES.map((store) => {
    const totalDays = randomInt(10, 60);
    const failedDays = randomInt(0, Math.round(totalDays * 0.3));
    const okDays = totalDays - failedDays;
    return {
      storeCode: store.storeCode,
      storeName: store.storeName,
      branchId: store.branchId,
      branchName: store.branchName,
      totalDays,
      failedDays,
      okDays,
      failRate: totalDays > 0 ? +((failedDays / totalDays) * 100).toFixed(2) : 0,
      firstDate: toWibDate(daysAgo(totalDays)),
      lastDate: toWibDate(daysAgo(0)),
    };
  })
    .filter((r) => r.failedDays > 0 && r.okDays > 0)
    .sort((a, b) => b.failedDays - a.failedDays || b.failRate - a.failRate)
    .slice(0, 30);

  const totalStoresWithFailures = ranked.length;
  const totalFailureDays = ranked.reduce((sum, r) => sum + r.failedDays, 0);

  return {
    ranking: ranked,
    summary: {
      totalStoresWithHistory: STORES.length,
      totalStoresWithFailures,
      totalFailureDays,
      dateRange: {
        from: ranked.length > 0 ? ranked[ranked.length - 1].firstDate : toWibDate(),
        to: toWibDate(),
      },
    },
  };
}

function buildStoreEodHistory(storeCode) {
  const store = STORES.find((s) => s.storeCode === storeCode);
  if (!store) return [];
  const records = [];
  for (let i = 13; i >= 0; i--) {
    const date = daysAgo(i);
    const dateKey = toWibDate(date);
    const status = generateHistoricalStatus(i);
    const isDone = status === "done";
    records.push({
      date: dateKey,
      businessDate: dateKey,
      status,
      statusSales: isDone ? "Ok" : "Not Ok",
      uploadPercent: isDone ? 100 : randomInt(0, 85),
      storeName: store.storeName,
      branchId: store.branchId,
      branchName: store.branchName,
      area: store.region,
      regional: store.region,
    });
  }
  return records;
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
app.get("/api/dashboard/summary", (req, res) => {
  return ok(res, buildDashboardSummary(), { timezone: "Asia/Jakarta" });
});

app.get("/api/dashboard/alerts", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "10", 10), 50);
  const alerts = buildDashboardAlerts().slice(0, limit);
  return ok(res, alerts, { timezone: "Asia/Jakarta" });
});

app.post("/api/dashboard/sync", (req, res) => {
  // Simulate sync delay
  setTimeout(() => {
    return ok(res, buildDashboardSummary(), { refreshedAt: toWibIso(new Date()), sync: { ok: true, reason: "manual_dashboard_sync" }, timezone: "Asia/Jakarta" });
  }, 300);
});

// ─── EOD ───────────────────────────────────────────────────────────────────────
app.get("/api/eod/stores", (req, res) => {
  const { date, areaId, status, q } = req.query;
  let rows = buildEodStoreRows(date || undefined);

  if (areaId) rows = rows.filter((r) => String(r.areaId) === String(areaId));
  if (status) rows = rows.filter((r) => r.status === status);
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter((r) => r.storeCode.toLowerCase().includes(needle) || r.storeName.toLowerCase().includes(needle));
  }

  const result = paginate(rows, req.query);
  return ok(res, result.data, { ...result.meta, date: date || toWibDate(), snapshotMode: date && date < toWibDate() ? "history" : "current" });
});

app.get("/api/eod/areas", (req, res) => {
  const { date } = req.query;
  const rows = buildEodStoreRows(date || undefined);
  const areas = buildEodAreas(rows);
  return ok(res, areas, { date: date || toWibDate(), timezone: "Asia/Jakarta" });
});

app.get("/api/eod/areas-summary", (req, res) => {
  const rows = buildEodStoreRows();
  const areas = buildEodAreas(rows);
  return ok(res, areas, { timezone: "Asia/Jakarta" });
});
app.get("/api/eod/summary-by-branch", (req, res) => {
  const rows = buildEodStoreRows();
  const areas = buildEodAreas(rows);
  return ok(res, areas, { timezone: "Asia/Jakarta" });
});

app.get("/api/eod/trend", (req, res) => {
  const days = Math.min(30, Math.max(1, parseInt(req.query.days, 10) || 7));
  const data = buildEodTrend(days);
  return ok(res, data, { timezone: "Asia/Jakarta" });
});

app.get("/api/eod/live", (req, res) => {
  const result = buildEodRanking();
  return ok(res, result, { cachedAt: new Date().toISOString(), cacheTtlMs: 300000, timezone: "Asia/Jakarta" });
});

app.get("/api/eod/history", (req, res) => {
  const { storeCode, from, to } = req.query;
  if (!storeCode) return fail(res, 400, "BAD_REQUEST", "storeCode is required");

  let history = buildStoreEodHistory(storeCode);
  if (from) history = history.filter((r) => r.date >= from);
  if (to) history = history.filter((r) => r.date <= to);

  return ok(res, history, { storeCode, from: from || history[0]?.date, to: to || history[history.length - 1]?.date, timezone: "Asia/Jakarta", source: "history" });
});

app.get("/api/eod/detail/:storeCode", (req, res) => {
  const store = STORES.find((s) => s.storeCode === req.params.storeCode);
  if (!store) return fail(res, 404, "NOT_FOUND", "Store not found");

  const status = generateEodStatus();
  const isDone = status === "done";
  const eodAt = isDone ? randomTimeInWindow(19, 23) : null;

  return ok(res, {
    store: {
      storeId: Number(store.storeCode),
      storeCode: store.storeCode,
      storeName: store.storeName,
      areaId: store.branchId,
      areaName: store.branchName,
      region: store.region,
      address: store.address,
      picName: store.picName,
      phone: store.phone,
      status: "active",
    },
    eod: {
      date: toWibDate(),
      status,
      lastEodAt: eodAt ? toWibIso(eodAt) : null,
      lastSyncAt: randomPastMinutes(30),
      source: "internal-data",
      errorMessage: status === "failed" ? "EOD not completed by deadline" : null,
    },
  }, { timezone: "Asia/Jakarta" });
});

app.get("/api/eod/late-stores", (req, res) => {
  const rows = buildEodStoreRows();
  const { branchId } = req.query;
  const late = rows
    .filter((r) => {
      if (r.status === "done") return false;
      if (branchId && String(r.areaId) !== String(branchId)) return false;
      return true;
    })
    .map((r) => ({
      storeCode: r.storeCode,
      storeName: r.storeName,
      branchId: r.areaId,
      branchName: r.areaName,
      status: r.status,
      statusSales: r.status === "failed" ? "Not Ok" : null,
      uploadPercent: r.status === "done" ? 100 : randomInt(0, 85),
      maxUploadAt: r.lastSyncAt,
      lastUploadAt: r.lastSyncAt,
      lateByMinutes: randomInt(5, 120),
    }));
  return ok(res, late, { timezone: "Asia/Jakarta" });
});

app.get("/api/eod/export", (req, res) => {
  const date = req.query.date || toWibDate();
  const areaId = req.query.areaId || null;
  const rows = buildEodStoreRows(date);

  let filtered = rows;
  if (areaId) filtered = filtered.filter((r) => String(r.areaId) === String(areaId));

  const branchRows = buildEodAreas(filtered);
  const doneCount = filtered.filter((r) => r.status === "done").length;
  const pendingCount = filtered.filter((r) => r.status === "pending").length;
  const failedCount = filtered.filter((r) => r.status === "failed").length;

  // Return metadata about what the export would contain (actual XLSX not needed for mock)
  return ok(res, {
    fileName: `eod_monitor_${date}.xlsx`,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    contentBase64: Buffer.from(
      JSON.stringify({
        reportDate: date,
        generatedAt: toWibIso(new Date()),
        scopeLabel: areaId || "All Branches",
        scopeStoreCount: filtered.length,
        doneCount,
        pendingCount,
        failedCount,
        branches: branchRows,
        stores: filtered,
      })
    ).toString("base64"),
  });
});

app.post("/api/eod/sync", (req, res) => {
  const { date, scope } = req.body || {};
  setTimeout(() => {
    return ok(res, { queued: true, date: date || toWibDate(), scope: scope || 'all', storeCount: STORES.length });
  }, 300);
});

app.post("/api/eod/retry", (req, res) => {
  const { storeCode, date } = req.body || {};
  if (!storeCode) return fail(res, 400, "BAD_REQUEST", "storeCode is required");
  return ok(res, { queued: true, storeCode, date: date || toWibDate() });
});

app.post("/api/eod/retry-batch", (req, res) => {
  const { storeCodes } = req.body || {};
  if (!storeCodes || storeCodes.length === 0) return fail(res, 400, "BAD_REQUEST", "storeCodes is required");
  return ok(res, { queued: storeCodes.length, accepted: storeCodes.map((sc) => ({ storeCode: sc, date: toWibDate() })), rejected: [] });
});

// ─── Backward-compatible EOD routes ────────────────────────────────────────────
app.get("/api/eod/status", (req, res) => {
  const rows = buildEodStoreRows();
  const data = rows.map((r) => ({
    storeId: r.storeCode,
    storeName: r.storeName,
    region: STORES.find((s) => s.storeCode === r.storeCode)?.region || "",
    status: r.status,
    lastUpdate: r.lastSyncAt,
    eodDate: toWibDate(),
    isFinal: r.status === "done" && Math.random() > 0.2,
  }));
  return ok(res, data, { summary: { total: data.length, done: data.filter((s) => s.status === "done").length, pending: data.filter((s) => s.status === "pending").length, failed: data.filter((s) => s.status === "failed").length }, timezone: "Asia/Jakarta" });
});

// ─── Stores ────────────────────────────────────────────────────────────────────
app.get("/api/stores", (req, res) => {
  const data = STORES.map((store) => ({
    storeId: store.storeCode,
    storeCode: store.storeCode,
    storeName: store.storeName,
    areaId: store.branchId,
    areaName: store.branchName,
    region: store.region,
    address: store.address,
    picName: store.picName,
    phone: store.phone,
    status: store.status,
    employeeCount: store.employeeCount,
    lastSync: randomPastMinutes(15),
    openingDate: store.openingDate,
  }));

  const result = paginate(data, req.query);
  return ok(res, result.data, result.meta);
});

app.get("/api/stores/:storeCode", (req, res) => {
  const store = STORES.find((s) => s.storeCode === req.params.storeCode);
  if (!store) return fail(res, 404, "NOT_FOUND", "Store not found");
  return ok(res, {
    storeId: store.storeCode,
    storeCode: store.storeCode,
    storeName: store.storeName,
    areaId: store.branchId,
    areaName: store.branchName,
    region: store.region,
    address: store.address,
    picName: store.picName,
    phone: store.phone,
    status: store.status,
    employeeCount: store.employeeCount,
    openingDate: store.openingDate,
  });
});

// ─── Employees ─────────────────────────────────────────────────────────────────

app.get("/api/employees", (req, res) => {
  let localMockEmployeeIndex = 1;
  const employees = [];
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const datePrefix = `${yy}${mm}${dd}`;

  STORES.forEach((store) => {
    // Deterministic count based on store code hash
    const hash = store.storeCode.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const count = 15 + (hash % 10);
    for (let i = 0; i < count; i++) {
      const pIdx = String(localMockEmployeeIndex).padStart(4, "0");
      localMockEmployeeIndex++;

      const newNik = `${datePrefix}${pIdx}`;

      employees.push({
        id: `demo-employee-${pIdx}`,
        nik: newNik,
        fullName: `${faker.person.firstName()} ${faker.person.lastName()}`,
        role: pickRandom(["Store Manager", "Assistant Manager", "Supervisor", "Cashier", "Sales Associate", "Warehouse Staff"]),
        storeCode: store.storeCode,
        storeName: store.storeName,
        branchId: store.branchId,
        branchName: store.branchName,
        status: pickRandom(["ACTIVE", "ACTIVE", "ACTIVE", "INACTIVE"]),
        lastActivity: randomPastMinutes(1440),
      });
    }
  });

  const { q, storeCode, branchId } = req.query;
  let filtered = employees;
  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter((e) => e.nik.includes(needle) || e.fullName.toLowerCase().includes(needle));
  }
  if (storeCode) filtered = filtered.filter((e) => e.storeCode === storeCode);
  if (branchId) filtered = filtered.filter((e) => e.branchId === branchId);

  const result = paginate(filtered, req.query);
  return ok(res, result.data, result.meta);
});

app.get("/api/employees/:nik", (req, res) => {
  let localMockEmployeeIndex = 1;
  const employees = [];
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const datePrefix = `${yy}${mm}${dd}`;

  STORES.forEach((store) => {
    const hash = store.storeCode.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const count = 15 + (hash % 10);
    for (let i = 0; i < count; i++) {
      const pIdx = String(localMockEmployeeIndex).padStart(4, "0");
      localMockEmployeeIndex++;
      const newNik = `${datePrefix}${pIdx}`;

      employees.push({
        id: `demo-employee-${pIdx}`,
        nik: newNik,
        fullName: `${faker.person.firstName()} ${faker.person.lastName()}`,
        role: pickRandom(["Store Manager", "Assistant Manager", "Supervisor"]),
        storeCode: store.storeCode,
        storeName: store.storeName,
        branchId: store.branchId,
        branchName: store.branchName,
        status: "ACTIVE",
        lastActivity: randomPastMinutes(1440),
      });
    }
  });
  const emp = employees.find((e) => e.nik === req.params.nik);
  if (!emp) return fail(res, 404, "NOT_FOUND", "Employee not found");
  return ok(res, emp);
});

// ─── Sync ──────────────────────────────────────────────────────────────────────
app.get("/api/sync/summary", (req, res) => {
  const excludeBazar = req.query.excludeBazar === '1';
  const stores = excludeBazar ? STORES.filter(s => !s.storeName.toLowerCase().includes('bazar')) : STORES;

  const synced = stores.filter(() => Math.random() > 0.2).length;
  const stale = stores.filter(() => Math.random() > 0.7).length;
  const problem = stores.filter(() => Math.random() > 0.85).length;
  const oldestIdx = randomInt(0, Math.max(0, stores.length - 1));
  const oldest = stores[oldestIdx];

  return ok(res, {
    totalStores: stores.length,
    synced,
    stale,
    problem,
    oldest: oldest ? {
      storeCode: oldest.storeCode,
      namaToko: oldest.storeName,
      ageSec: randomInt(300, 3600),
    } : null,
    thresholdsSec: {
      syncedMax: 300,
      staleMax: 600,
    },
  }, { timezone: "Asia/Jakarta", updatedAt: toWibIso(new Date()) });
});

app.get("/api/sync/stores", (req, res) => {
  const { page, pageSize, sort, branch, status, search, excludeBazar } = req.query;
  let stores = excludeBazar === '1' ? STORES.filter(s => !s.storeName.toLowerCase().includes('bazar')) : [...STORES];

  if (branch) stores = stores.filter(s => String(s.branchId) === String(branch));
  if (status) {
    stores = stores.filter(s => {
      const ageSec = randomInt(0, 1800);
      if (status === 'problem') return ageSec > 600 || Math.random() > 0.85;
      if (status === 'stale') return ageSec > 300 && ageSec <= 600;
      if (status === 'synced') return ageSec <= 300;
      return true;
    });
  }
  if (search) {
    const needle = search.toLowerCase();
    stores = stores.filter(s => s.storeCode.toLowerCase().includes(needle) || s.storeName.toLowerCase().includes(needle));
  }

  const data = stores.map(store => {
    const lastSyncAgoSec = randomInt(0, 1800);
    const isProblem = lastSyncAgoSec > 600 || Math.random() > 0.85;
    const isStale = !isProblem && lastSyncAgoSec > 300;
    return {
      storeId: store.storeCode,
      storeCode: store.storeCode,
      storeName: store.storeName,
      branchId: store.branchId,
      branchName: store.branchName,
      lastSyncAt: randomPastMinutes(30),
      lastSyncAgoSec,
      status: isProblem ? 'problem' : isStale ? 'stale' : 'synced',
      isProblem,
      isStale,
    };
  });

  if (sort === 'ageDesc') data.sort((a, b) => b.lastSyncAgoSec - a.lastSyncAgoSec);

  const result = paginate(data, { page, pageSize });
  return ok(res, result.data, result.meta);
});

app.post("/api/sync/refresh", (req, res) => {
  setTimeout(() => {
    return ok(res, { total: STORES.length, refreshedAt: toWibIso(new Date()) });
  }, 300);
});

app.get("/api/sync/history/:storeCode", (req, res) => {
  const { storeCode } = req.params;
  const minutes = parseInt(req.query.minutes || '30', 10);
  const store = STORES.find(s => s.storeCode === storeCode);
  if (!store) return fail(res, 404, "NOT_FOUND", "Store not found");

  const records = [];
  const now = new Date();
  for (let i = 0; i < Math.min(10, minutes / 3); i++) {
    const polledAt = new Date(now.getTime() - i * 3 * 60000);
    const lastSyncAgoSec = randomInt(0, minutes * 60);
    const isProblem = lastSyncAgoSec > 600;
    const isStale = !isProblem && lastSyncAgoSec > 300;
    records.push({
      id: `hist-${storeCode}-${i}`,
      storeCode,
      storeName: store.storeName,
      polledAt: polledAt.toISOString(),
      lastSyncAt: new Date(polledAt.getTime() - lastSyncAgoSec * 1000).toISOString(),
      isProblem,
      isStale,
    });
  }
  return ok(res, { records, storeCode }, { timezone: "Asia/Jakarta" });
});

app.get("/api/sync/history/:storeCode/summary", (req, res) => {
  const { storeCode } = req.params;
  const { date, bucketMinutes } = req.query;
  const store = STORES.find(s => s.storeCode === storeCode);
  if (!store) return fail(res, 404, "NOT_FOUND", "Store not found");

  const bucketMin = parseInt(bucketMinutes || '10', 10);
  const buckets = [];
  for (let h = 6; h < 23; h += Math.max(1, Math.floor(bucketMin / 60))) {
    const bucketStart = new Date();
    bucketStart.setHours(h, 0, 0, 0);
    const bucketEnd = new Date(bucketStart.getTime() + bucketMin * 60000);
    const isProblem = Math.random() > 0.8;
    const isStale = !isProblem && Math.random() > 0.6;
    buckets.push({
      id: `bucket-${storeCode}-${h}`,
      storeCode,
      storeName: store.storeName,
      bucketStart: bucketStart.toISOString(),
      bucketEnd: bucketEnd.toISOString(),
      isProblem,
      isStale,
    });
  }

  const syncedBuckets = buckets.filter(b => !b.isProblem && !b.isStale).length;
  const staleBuckets = buckets.filter(b => b.isStale).length;
  const problemBuckets = buckets.filter(b => b.isProblem).length;

  return ok(res, {
    buckets,
    summary: {
      totalBuckets: buckets.length,
      syncedBuckets,
      staleBuckets,
      problemBuckets,
    },
  }, { timezone: "Asia/Jakarta" });
});

app.get("/api/sync/status", (req, res) => {
  const data = STORES.map((store) => {
    const statusWeights = store.storeCode.endsWith("1") ? [60, 20, 10, 10] : [70, 15, 10, 5];
    const statuses = ["synced", "synced", "delayed", "error"];
    return {
      storeId: store.storeCode,
      storeName: store.storeName,
      storeCode: store.storeCode,
      branchId: store.branchId,
      branchName: store.branchName,
      lastSync: randomPastMinutes(30),
      lastSyncAt: randomPastMinutes(30),
      lastSyncAgoSec: randomInt(0, 1800),
      rowsUploaded: randomInt(100, 2500),
      rowsPending: randomInt(0, 50),
      status: pickRandom(statuses),
      connection: pickRandom(["online", "online", "online", "offline"]),
      isMissingToday: Math.random() > 0.85,
    };
  });
  return ok(res, data, { timezone: "Asia/Jakarta" });
});

app.get("/api/sync/audit", (req, res) => {
  const entries = [];
  const count = Math.min(200, parseInt(req.query.limit || "50", 10));
  for (let i = 0; i < count; i++) {
    const store = pickRandom(STORES);
    entries.push({
      id: faker.string.uuid(),
      timestamp: randomPastMinutes(1440),
      storeId: store.storeCode,
      storeName: store.storeName,
      storeCode: store.storeCode,
      event: pickRandom(["sync_started", "sync_completed", "sync_failed", "connection_lost", "connection_restored", "data_validated"]),
      details: faker.lorem.sentence({ min: 5, max: 15 }),
      rowsAffected: randomInt(0, 500),
    });
  }
  entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const result = paginate(entries, req.query);
  return ok(res, result.data, result.meta);
});

app.post("/api/sync/trigger", (req, res) => {
  const { storeCode } = req.body || {};
  const store = storeCode ? STORES.find((s) => s.storeCode === storeCode) : pickRandom(STORES);
  setTimeout(() => {
    ok(res, {
      jobId: faker.string.uuid(),
      storeId: store?.storeCode || "ALL",
      storeName: store?.storeName || "All Stores",
      status: "started",
      triggeredAt: new Date().toISOString(),
      estimatedDuration: `${randomInt(5, 30)}s`,
    });
  }, 500);
});

// ─── Backups ───────────────────────────────────────────────────────────────────
let backupFiles = [];
(function initBackups() {
  for (let i = 0; i < randomInt(15, 30); i++) {
    const date = new Date(Date.now() - i * 86400000 * (Math.random() > 0.7 ? randomInt(1, 3) : 1));
    const type = date.getUTCHours() === 0 && date.getUTCMinutes() < 10 ? "scheduled" : "manual";
    const failed = Math.random() > 0.92;
    backupFiles.push({
      fileName: `${type}_backup_${date.toISOString().replace(/[:.]/g, "").replace("T", "_").slice(0, 15)}.sql.gz`,
      type,
      date: toWibDate(date),
      sizeBytes: randomInt(12 * 1024 * 1024, 80 * 1024 * 1024),
      modifiedAt: date.toISOString(),
      status: failed ? "FAILED" : "SUCCESS",
      triggeredBy: type === "scheduled" ? "system" : pickRandom(["admin", "super_admin"]),
    });
  }
  backupFiles.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
})();

function getLatestSuccessfulBackup() {
  return backupFiles.find((b) => b.status === "SUCCESS") || null;
}

app.get("/api/backups/summary", (req, res) => {
  const successful = backupFiles.filter((b) => b.status === "SUCCESS");
  const latest = getLatestSuccessfulBackup();
  const totalSizeBytes = successful.reduce((acc, f) => acc + f.sizeBytes, 0);
  return ok(res, {
    count: successful.length,
    totalSizeBytes,
    latestBackupAt: latest ? latest.modifiedAt : null,
    latestFileName: latest ? latest.fileName : null,
    storagePath: "/backups",
    disk: {
      totalBytes: 100 * 1024 * 1024 * 1024,
      freeBytes: 40 * 1024 * 1024 * 1024,
      usedBytes: 60 * 1024 * 1024 * 1024,
      usedPercent: 60,
    },
    schedule: { enabled: true, cron: "05 00 * * *", tz: "Asia/Jakarta" },
  }, { timezone: "Asia/Jakarta" });
});

app.get("/api/backups/files", (req, res) => {
  const result = paginate(backupFiles, req.query);
  return ok(res, result.data, result.meta);
});

app.post("/api/backups/run", (req, res) => {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "").replace("T", "_").slice(0, 15);
  const type = (req.body?.type || "manual").toLowerCase() === "scheduled" ? "scheduled" : "manual";
  const newBackup = {
    fileName: `${type}_backup_${stamp}.sql.gz`,
    type,
    date: toWibDate(now),
    sizeBytes: randomInt(12 * 1024 * 1024, 80 * 1024 * 1024),
    modifiedAt: now.toISOString(),
    status: "SUCCESS",
    triggeredBy: type === "scheduled" ? "system" : "admin",
  };
  backupFiles.unshift(newBackup);
  return ok(res, { fileName: newBackup.fileName, sizeBytes: newBackup.sizeBytes, sizeMB: +(newBackup.sizeBytes / 1024 / 1024).toFixed(2), backupLogId: faker.string.uuid() });
});

app.delete("/api/backups/:fileName", (req, res) => {
  const { confirm } = req.body || {};
  const fileName = req.params.fileName;
  if (!confirm || String(confirm) !== String(fileName)) {
    return fail(res, 400, "BAD_REQUEST", "Filename confirmation does not match");
  }
  const idx = backupFiles.findIndex((b) => b.fileName === fileName);
  if (idx === -1) return fail(res, 404, "NOT_FOUND", "Backup file not found");
  backupFiles.splice(idx, 1);
  return ok(res, { deleted: true, fileName });
});

app.get("/api/backups/download/:fileName", (req, res) => {
  const fileName = req.params.fileName;
  const backup = backupFiles.find((b) => b.fileName === fileName);
  if (!backup) return fail(res, 404, "NOT_FOUND", "Backup file not found");
  const content = faker.string.alphanumeric({ length: randomInt(100, 500) });
  return ok(res, { fileName, contentType: "application/octet-stream", contentBase64: Buffer.from(content).toString("base64"), sizeBytes: content.length });
});

app.post("/api/backups/restore", (req, res) => {
  const { fileName, confirmText } = req.body || {};
  if (!fileName) return fail(res, 400, "BAD_REQUEST", "fileName is required");
  if (String(confirmText || "").trim() !== "RESTORE") return fail(res, 400, "BAD_REQUEST", "confirmText must be RESTORE");
  return ok(res, { queued: true, fileName });
});

// Legacy backup endpoints
app.get("/api/backups", (req, res) => {
  const result = paginate(backupFiles, req.query);
  return ok(res, result.data, result.meta);
});

app.post("/api/backup/trigger", (req, res) => {
  setTimeout(() => {
    ok(res, {
      jobId: faker.string.uuid(),
      status: "started",
      type: req.body?.type || "manual",
      triggeredAt: new Date().toISOString(),
      estimatedSize: `${randomInt(12, 80)}MB`,
    });
  }, 300);
});

// ─── Agents ────────────────────────────────────────────────────────────────────
app.get("/api/agents", (req, res) => {
  const agents = STORES.map((store) => ({
    id: `AG-${store.storeCode}`,
    storeId: store.storeCode,
    storeName: store.storeName,
    storeCode: store.storeCode,
    branchId: store.branchId,
    branchName: store.branchName,
    version: `v${randomInt(2, 4)}.${randomInt(0, 9)}.${randomInt(0, 99)}`,
    status: pickRandom(["online", "online", "online", "offline", "updating"]),
    lastHeartbeat: randomPastMinutes(5),
    uptime: `${randomInt(1, 720)}h ${randomInt(0, 59)}m`,
    cpu: `${randomInt(5, 60)}%`,
    memory: `${randomInt(100, 800)}MB`,
  }));

  const result = paginate(agents, req.query);
  return ok(res, result.data, result.meta);
});

// ─── Alerts ────────────────────────────────────────────────────────────────────
app.get("/api/alerts", (req, res) => {
  const limit = Math.min(50, parseInt(req.query.limit || "20", 10));
  const alerts = [];
  for (let i = 0; i < limit; i++) {
    const store = pickRandom(STORES);
    const types = [
      { type: "warning", title: "EOD deadline approaching", sev: "LOW" },
      { type: "critical", title: "Sync failure detected", sev: "HIGH" },
      { type: "warning", title: "Agent version outdated", sev: "MEDIUM" },
      { type: "critical", title: "Late EOD submission", sev: "HIGH" },
      { type: "warning", title: "Connection timeout", sev: "MEDIUM" },
      { type: "info", title: "Backup size anomaly", sev: "LOW" },
      { type: "critical", title: "System health degraded", sev: "HIGH" },
    ];
    const alert = pickRandom(types);
    alerts.push({
      id: faker.string.uuid(),
      type: alert.type,
      severity: alert.sev,
      title: alert.title,
      message: faker.lorem.sentence(),
      storeId: store.storeCode,
      storeName: store.storeName,
      timestamp: randomPastMinutes(120),
      createdAt: randomPastMinutes(120),
      acknowledged: Math.random() > 0.6,
      resolved: Math.random() > 0.8,
    });
  }
  return ok(res, alerts, { timezone: "Asia/Jakarta" });
});

// ─── System ────────────────────────────────────────────────────────────────────
app.get("/api/system/overview", (req, res) => {
  const uptimeSeconds = randomInt(86400, 604800);
  return ok(res, {
    hostname: "eom-api",
    platform: "linux",
    uptimeSeconds,
    loadavg: [randomInt(1, 4) / 10, randomInt(2, 6) / 10, randomInt(3, 8) / 10],
    memory: {
      totalBytes: 4 * 1024 * 1024 * 1024,
      freeBytes: randomInt(1, 3) * 1024 * 1024 * 1024,
    },
    disk: {
      totalBytes: 100 * 1024 * 1024 * 1024,
      freeBytes: randomInt(15, 60) * 1024 * 1024 * 1024,
      usedBytes: randomInt(40, 85) * 1024 * 1024 * 1024,
      usedPercent: randomInt(40, 85),
    },
    timezone: "Asia/Jakarta",
    generatedAt: new Date().toISOString(),
  });
});

app.get("/api/system/services", (req, res) => {
  return ok(res, [
    { name: "API Server", status: "ONLINE", lastCheckedAt: new Date().toISOString() },
    { name: "Database", status: pickRandom(["ONLINE", "ONLINE", "ONLINE", "DEGRADED"]), lastCheckedAt: new Date().toISOString() },
    { name: "Scheduler", status: pickRandom(["ONLINE", "ONLINE", "ONLINE", "UNKNOWN"]), lastCheckedAt: new Date().toISOString() },
    { name: "Notification Service", status: pickRandom(["ONLINE", "ONLINE", "DEGRADED"]), lastCheckedAt: new Date().toISOString() },
    { name: "Data Sync", status: "ONLINE", lastCheckedAt: new Date().toISOString() },
    { name: "Backup Service", status: pickRandom(["ONLINE", "ONLINE", "ONLINE", "DEGRADED"]), lastCheckedAt: new Date().toISOString() },
  ]);
});

app.get("/api/system/logs", (req, res) => {
  const { level, component, q } = req.query;
  const count = 200;
  const logs = [];
  const levels = ["INFO", "INFO", "INFO", "WARNING", "ERROR", "CRITICAL"];
  const components = ["API", "API", "DB", "SYNC", "SCHEDULER", "BACKUP", "AUTH", "NOTIFICATION"];

  for (let i = 0; i < count; i++) {
    const logLevel = pickRandom(levels);
    logs.push({
      id: faker.string.uuid(),
      level: logLevel,
      component: pickRandom(components),
      message: logLevel === "ERROR" || logLevel === "CRITICAL"
        ? pickRandom(["Connection timeout", "Query failed", "Service unresponsive", "Disk space low", "Memory threshold exceeded"])
        : pickRandom(["Health check passed", "Sync completed", "Backup created", "User authenticated", "Scheduled job ran"]),
      createdAt: randomPastMinutes(1440),
      metadata: {},
    });
  }
  logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  let filtered = logs;
  if (level) filtered = filtered.filter((l) => l.level === level.toUpperCase());
  if (component) filtered = filtered.filter((l) => l.component === component.toUpperCase());
  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter((l) => l.message.toLowerCase().includes(needle));
  }

  const result = paginate(filtered, req.query);
  return ok(res, result.data, result.meta);
});

app.post("/api/system/restart/:service", (req, res) => {
  const service = req.params.service;
  const validServices = ["api", "database", "scheduler", "notification", "data-sync", "backup"];
  if (!validServices.includes(service)) {
    return fail(res, 400, "BAD_REQUEST", `Unknown service: ${service}`);
  }
  return ok(res, { queued: true, service, requestedAt: new Date().toISOString() });
});

app.post("/api/system/healthcheck", (req, res) => {
  return ok(res, {
    database: pickRandom(["healthy", "healthy", "degraded"]),
    api: "healthy",
    scheduler: pickRandom(["running", "running", "idle"]),
    backup: pickRandom(["healthy", "healthy", "degraded"]),
    checkedAt: toWibIso(new Date()),
  });
});

app.get("/api/system/logs/export", (req, res) => {
  return ok(res, {
    fileName: `system_logs_${toWibDate()}.xlsx`,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    contentBase64: Buffer.from("mock excel content").toString("base64"),
  });
});

// ─── Agent Monitoring ──────────────────────────────────────────────────────────
const OFFICE_MACHINES = [
  { id: "OM-001", hostname: "HQ-LAPTOP-01", label: "Head Office - Finance", os: "Windows 11 Pro", cpu: "Intel i7-12700H", ram: "16GB", disk: "512GB SSD", status: "online" },
  { id: "OM-002", hostname: "HQ-LAPTOP-02", label: "Head Office - HR", os: "Windows 11 Pro", cpu: "Intel i5-12400", ram: "8GB", disk: "256GB SSD", status: "online" },
  { id: "OM-003", hostname: "NORTH-DESK-01", label: "North Hub - Admin", os: "Windows 10 Pro", cpu: "AMD Ryzen 5 5600G", ram: "16GB", disk: "512GB SSD", status: "online" },
  { id: "OM-004", hostname: "EAST-DESK-01", label: "East Hub - Operations", os: "Windows 11 Pro", cpu: "Intel i7-12700", ram: "32GB", disk: "1TB SSD", status: "offline" },
  { id: "OM-005", hostname: "CENTRAL-PC-01", label: "Central Hub - Manager", os: "Windows 11 Pro", cpu: "Intel i5-13500", ram: "16GB", disk: "512GB SSD", status: "online" },
  { id: "OM-006", hostname: "WEST-LAPTOP-01", label: "West Hub - IT", os: "Windows 11 Pro", cpu: "AMD Ryzen 7 5800H", ram: "32GB", disk: "1TB SSD", status: "online" },
  { id: "OM-007", hostname: "SOUTH-DESK-01", label: "South Hub - Admin", os: "Windows 10 Pro", cpu: "Intel i3-12100", ram: "8GB", disk: "256GB SSD", status: "warning" },
  { id: "OM-008", hostname: "COASTAL-PC-01", label: "Coastal Hub - Operations", os: "Windows 11 Pro", cpu: "Intel i5-12400", ram: "16GB", disk: "512GB SSD", status: "online" },
];

app.get("/api/agent/monitoring", (req, res) => {
  const { areaId, region, q } = req.query;
  let machines = OFFICE_MACHINES.map(m => ({
    ...m,
    cpu_percent: m.status === 'online' ? randomInt(5, 85) : 0,
    ram_percent: m.status === 'online' ? randomInt(20, 90) : 0,
    disk_percent: randomInt(30, 95),
    network_up: m.status === 'online' ? randomInt(100, 5000) : 0,
    network_down: m.status === 'online' ? randomInt(500, 10000) : 0,
    agent_version: `v${randomInt(2, 4)}.${randomInt(0, 9)}.${randomInt(0, 99)}`,
    last_heartbeat: m.status === 'online' ? randomPastMinutes(2) : randomPastMinutes(1440),
    uptime_sec: m.status === 'online' ? randomInt(3600, 604800) : 0,
    is_update_pending: Math.random() > 0.7,
    processes: m.status === 'online' ? randomInt(50, 200) : 0,
  }));

  if (areaId) machines = machines.filter(m => m.id.includes(areaId) || (m.label && m.label.toLowerCase().includes(areaId.toLowerCase())));
  if (region) machines = machines.filter(m => m.label && m.label.toLowerCase().includes(region.toLowerCase()));
  if (q) {
    const needle = q.toLowerCase();
    machines = machines.filter(m => m.hostname.toLowerCase().includes(needle) || (m.label && m.label.toLowerCase().includes(needle)));
  }

  return ok(res, machines, { timezone: "Asia/Jakarta", total: machines.length });
});

app.get("/api/agent/monitoring/export", (req, res) => {
  return ok(res, {
    fileName: `agent_monitoring_${toWibDate()}.xlsx`,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    contentBase64: Buffer.from("mock excel content").toString("base64"),
  });
});

app.delete("/api/agent/monitoring/:storeId", (req, res) => {
  const { storeId } = req.params;
  return ok(res, { deleted: true, storeId, resetTo: "not_installed" });
});

app.get("/api/agent/suggest-version", (req, res) => {
  return ok(res, { suggestedVersion: "4.2.1", currentVersion: "4.1.0", releaseNotes: "Bug fixes and performance improvements" });
});

app.post("/api/agent/upload", (req, res) => {
  const { version } = req.body || {};
  return ok(res, { uploaded: true, version: version || "4.2.1", deployedAt: toWibIso(new Date()) });
});

// ─── After Hours ──────────────────────────────────────────────────────────────
app.get("/api/system/health", (req, res) => {
  return ok(res, {
    status: pickRandom(["healthy", "healthy", "healthy", "degraded"]),
    uptime: `${randomInt(24, 720)}h ${randomInt(0, 59)}m`,
    apiVersion: "v2.4.1",
    database: { status: pickRandom(["connected", "connected", "connected", "degraded"]), latency: `${randomInt(2, 15)}ms`, connections: randomInt(5, 30) },
    cpu: { usage: `${randomInt(20, 70)}%`, cores: 4 },
    memory: { usage: `${randomInt(30, 80)}%`, total: "4GB", used: `${randomInt(1, 3)}GB` },
    disk: { usage: `${randomInt(40, 85)}%`, total: "100GB", used: `${randomInt(40, 85)}GB` },
    services: { api: "healthy", scheduler: pickRandom(["running", "running", "idle"]), notifications: pickRandom(["healthy", "healthy", "degraded"]) },
  });
});

// ─── After Hours ──────────────────────────────────────────────────────────────
const MOCK_AFTERHOURS_DATES = [];
for (let i = 0; i < 30; i++) {
  MOCK_AFTERHOURS_DATES.push(toWibDate(daysAgo(i)));
}

const MOCK_AFTERHOURS_SETTINGS = {
  warning_schedule_times: '["23:15","23:30","23:45","00:00"]',
  first_warning_time: "23:15",
  final_warning_time: "00:00",
  whatsapp_notify_enabled: "true",
  telegram_notify_enabled: "true",
  check_window_start: "20:00",
  check_window_end: "06:00"
};

app.get("/api/afterhours", (req, res) => {
  const count = randomInt(1, 5);
  const logs = [];
  for (let i = 0; i < count; i++) {
    const store = pickRandom(STORES);
    const uploadTime = new Date();
    uploadTime.setUTCHours(randomInt(22, 23), randomInt(0, 59), randomInt(0, 59), 0);
    logs.push({
      id: faker.string.uuid(),
      storeId: store.storeCode,
      storeName: store.storeName,
      storeCode: store.storeCode,
      branchId: store.branchId,
      branchName: store.branchName,
      activity: pickRandom(["data_upload", "eod_submission", "sync_trigger"]),
      timestamp: uploadTime.toISOString(),
      fileSize: `${randomInt(1, 20)}MB`,
      duration: `${randomInt(10, 300)}s`,
      status: pickRandom(["completed", "completed", "flagged"]),
      notes: faker.lorem.sentence(),
      detectedAt: uploadTime.toISOString(),
      notified: Math.random() > 0.4,
    });
  }
  return ok(res, logs, { timezone: "Asia/Jakarta" });
});

app.get("/api/afterhours/dates", (req, res) => {
  const limit = parseInt(req.query.limit || "12", 10);
  const dates = MOCK_AFTERHOURS_DATES.slice(0, limit).map((d) => ({
    check_date: d,
    violation_count: randomInt(1, 5)
  }));
  return ok(res, { dates });
});

app.get("/api/afterhours/summary", (req, res) => {
  const date = req.query.date || toWibDate();
  const branchStats = BRANCHES.map(b => ({
    branch_id: b.id,
    branch_name: b.name,
    violation_count: randomInt(0, 3)
  }));
  return ok(res, {
    date,
    summary: branchStats,
    totalViolations: branchStats.reduce((sum, b) => sum + b.violation_count, 0)
  });
});

app.get("/api/afterhours/settings", (req, res) => {
  return ok(res, { settings: MOCK_AFTERHOURS_SETTINGS });
});

app.put("/api/afterhours/settings", (req, res) => {
  const { settings } = req.body || {};
  if (settings && typeof settings === "object") {
    Object.assign(MOCK_AFTERHOURS_SETTINGS, settings);
  }
  return ok(res, { saved: Object.keys(settings || {}) });
});

app.post("/api/afterhours/check", (req, res) => {
  const runAllStages = req.body?.runAllStages || false;
  const totalViolations = randomInt(2, 6);
  return ok(res, {
    runMode: runAllStages ? "all_stages" : "single_stage",
    totalViolations,
    branchCount: randomInt(2, 4),
    stageResults: [
      { warningStage: 1, totalStages: 4, totalViolations, telegramSuccess: 1, whatsappSuccess: 1 }
    ]
  });
});

app.get("/api/afterhours/report/months", (req, res) => {
  const months = [
    { report_month: "2026-05", store_count: STORES.length, total_violation_days: randomInt(15, 45), generated_at: new Date().toISOString() },
    { report_month: "2026-04", store_count: STORES.length, total_violation_days: randomInt(30, 80), generated_at: daysAgo(30).toISOString() }
  ];
  return ok(res, { months });
});

app.get("/api/afterhours/report", (req, res) => {
  const month = req.query.month || "2026-05";
  const branch = req.query.branch;
  const search = req.query.search;
  
  let stores = STORES;
  if (branch) {
    stores = stores.filter(s => s.branchId === String(branch));
  }
  if (search) {
    const needle = search.toLowerCase();
    stores = stores.filter(s => s.storeCode.toLowerCase().includes(needle) || s.storeName.toLowerCase().includes(needle));
  }
  
  const ranking = stores.map((s, index) => ({
    rank: index + 1,
    store_code: s.storeCode,
    store_name: s.storeName,
    branch_id: s.branchId,
    branch_name: s.branchName,
    violation_count: randomInt(0, 10),
    last_activity_time: "22:15 WIB"
  })).sort((a, b) => b.violation_count - a.violation_count);

  return ok(res, {
    reportMonth: month,
    ranking: ranking.slice(0, 20),
    summary: {
      totalStores: stores.length,
      totalViolationDays: ranking.reduce((sum, s) => sum + s.violation_count, 0),
      reportWindowStart: "23:15",
      reportWindowEndExclusive: "01:00",
      generatedAt: new Date().toISOString()
    },
    filters: {
      month,
      branch,
      search: search || null,
      limit: 20
    }
  });
});

app.post("/api/afterhours/report/generate", (req, res) => {
  return ok(res, {
    success: true,
    month: req.body?.month || "2026-05",
    generatedAt: new Date().toISOString()
  });
});

app.get("/api/afterhours/report/export", (req, res) => {
  const month = req.query.month || "2026-05";
  return ok(res, {
    fileName: `afterhours_report_${month}.xlsx`,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    contentBase64: Buffer.from("Excel mock base64 content").toString("base64")
  });
});

// ─── Users & Roles mock database ───────────────────────────────────────────────
const MOCK_ACCOUNTS = {
  demo: {
    id: 1, username: "demo", password: "demo-password", role: "demo",
    name: "Demo (Read-Only)",
    effectivePerms: [
      "DASHBOARD_VIEW", "SYNC_VIEW", "EOD_VIEW", "STORES_VIEW", "EMPLOYEES_VIEW",
      "BACKUPS_VIEW", "SYSTEM_VIEW", "ACCOUNTS_VIEW",
      "NIK_LOOKUP", "USERS_VIEW", "ROLES_VIEW",
      "AFTERHOURS_VIEW", "AGENT_UPDATE",
      "SYSTEM_HEALTHCHECK",
    ],
    isDemo: true,
  },
  superadmin: {
    id: 2, username: "superadmin", password: "superadmin-password", role: "super_admin",
    name: "Super Admin",
    effectivePerms: [
      "DASHBOARD_VIEW", "SYNC_VIEW", "EOD_VIEW", "STORES_VIEW", "EMPLOYEES_VIEW",
      "BACKUPS_VIEW", "SYSTEM_VIEW", "ACCOUNTS_VIEW",
      "EOD_SYNC", "EOD_RETRY", "STORES_EDIT", "NIK_LOOKUP",
      "BACKUPS_RUN", "BACKUPS_DELETE", "BACKUPS_RESTORE",
      "SYSTEM_HEALTHCHECK", "SYSTEM_RESTART",
      "USERS_VIEW", "USERS_CREATE", "USERS_EDIT", "USERS_DELETE",
      "USERS_RESET_PASSWORD", "USERS_CHANGE_PASSWORD",
      "USERS_ROLE_EDIT", "USERS_PERMISSION_EDIT", "USERS_SCOPE_EDIT",
      "ROLES_VIEW", "ROLES_EDIT", "AFTERHOURS_VIEW", "AGENT_UPDATE",
    ],
  },
};

const MOCK_ROLES = [
  { id: 1, name: "viewer", label: "Viewer", description: "Read-only access to all dashboards", permissions: ["DASHBOARD_VIEW", "SYNC_VIEW", "EOD_VIEW", "STORES_VIEW", "EMPLOYEES_VIEW", "AFTERHOURS_VIEW"] },
  { id: 2, name: "ops", label: "Operations Manager", description: "Manage EOD submissions and retries", permissions: ["DASHBOARD_VIEW", "SYNC_VIEW", "EOD_VIEW", "STORES_VIEW", "EOD_SYNC", "EOD_RETRY", "AFTERHOURS_VIEW"] },
  { id: 3, name: "admin", label: "Administrator", description: "Manage users and system updates", permissions: ["DASHBOARD_VIEW", "SYNC_VIEW", "EOD_VIEW", "STORES_VIEW", "EMPLOYEES_VIEW", "BACKUPS_VIEW", "SYSTEM_VIEW", "EOD_SYNC", "EOD_RETRY", "STORES_EDIT", "NIK_LOOKUP", "BACKUPS_RUN", "SYSTEM_HEALTHCHECK", "USERS_VIEW", "USERS_CREATE", "USERS_EDIT", "ROLES_VIEW", "AFTERHOURS_VIEW", "AGENT_UPDATE"] },
  { id: 4, name: "super_admin", label: "Super Administrator", description: "Unrestricted root-level access", permissions: MOCK_ACCOUNTS.superadmin.effectivePerms }
];

const MOCK_USERS = [
  { id: 1, username: "demo", name: "Demo (Read-Only)", role: "demo", roleNames: ["demo"], effectivePerms: MOCK_ACCOUNTS.demo.effectivePerms, scopeBranches: [], isAllBranches: true, isDemo: true, roles: [1] },
  { id: 2, username: "superadmin", name: "Super Admin", role: "super_admin", roleNames: ["super_admin"], effectivePerms: MOCK_ACCOUNTS.superadmin.effectivePerms, scopeBranches: [], isAllBranches: true, roles: [4] },
  { id: 3, username: "opsmanager", name: "Ops Manager", role: "ops", roleNames: ["ops"], effectivePerms: ["DASHBOARD_VIEW", "SYNC_VIEW", "EOD_VIEW", "STORES_VIEW", "EOD_SYNC", "EOD_RETRY", "AFTERHOURS_VIEW"], scopeBranches: ["2", "3"], isAllBranches: false, roles: [2] }
];

const sessions = new Map();

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return fail(res, 401, "AUTH_FAILED", "Username and password are required");
  }

  let account = MOCK_USERS.find(
    (u) => u.username === username && password === `${username}-password`
  );

  if (!account && username === "demo" && password === "demo-password") {
    account = MOCK_USERS.find(u => u.username === "demo");
  } else if (!account && username === "superadmin" && password === "superadmin-password") {
    account = MOCK_USERS.find(u => u.username === "superadmin");
  }

  if (!account) {
    return fail(res, 401, "INVALID_CREDENTIALS", "Invalid username or password");
  }

  const token = "mock-jwt-token-" + faker.string.alphanumeric(32);
  sessions.set(token, account);

  return ok(res, {
    token,
    user: account,
  });
});

app.get("/api/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return fail(res, 401, "UNAUTHORIZED", "Not authenticated");
  }
  const token = authHeader.split(" ")[1];
  const account = sessions.get(token) || MOCK_USERS.find(u => u.username === "superadmin");
  return ok(res, {
    user: account,
  });
});

// ─── User Administration Endpoints ─────────────────────────────────────────────
app.get("/api/users", (req, res) => {
  const { q } = req.query;
  let filtered = [...MOCK_USERS];
  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter(u => u.username.toLowerCase().includes(needle) || u.name.toLowerCase().includes(needle));
  }
  const result = paginate(filtered, req.query);
  return ok(res, result.data, result.meta);
});

app.get("/api/users/:id", (req, res) => {
  const user = MOCK_USERS.find(u => u.id === parseInt(req.params.id, 10));
  if (!user) return fail(res, 404, "NOT_FOUND", "User not found");
  return ok(res, user);
});

app.post("/api/users", (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password) return fail(res, 400, "BAD_REQUEST", "Username and password required");
  if (MOCK_USERS.some(u => u.username === username)) {
    return fail(res, 409, "CONFLICT", "Username already exists");
  }
  const matchedRoleObj = MOCK_ROLES.find(r => r.name === role) || MOCK_ROLES[0];
  const newUser = {
    id: MOCK_USERS.length + 1,
    username,
    name: username.charAt(0).toUpperCase() + username.slice(1),
    role: matchedRoleObj.name,
    roleNames: [matchedRoleObj.name],
    effectivePerms: [...matchedRoleObj.permissions],
    scopeBranches: [],
    isAllBranches: true,
    roles: [matchedRoleObj.id]
  };
  MOCK_USERS.push(newUser);
  return ok(res, newUser);
});

app.patch("/api/users/:id", (req, res) => {
  const user = MOCK_USERS.find(u => u.id === parseInt(req.params.id, 10));
  if (!user) return fail(res, 404, "NOT_FOUND", "User not found");
  const { role } = req.body || {};
  if (role) {
    const roleObj = MOCK_ROLES.find(r => r.name === role);
    if (roleObj) {
      user.role = roleObj.name;
      user.roleNames = [roleObj.name];
      user.roles = [roleObj.id];
      user.effectivePerms = [...roleObj.permissions];
    }
  }
  return ok(res, user);
});

app.patch("/api/users/:id/roles", (req, res) => {
  const user = MOCK_USERS.find(u => u.id === parseInt(req.params.id, 10));
  if (!user) return fail(res, 404, "NOT_FOUND", "User not found");
  const { role_ids } = req.body || {};
  if (role_ids) {
    user.roles = role_ids.map(Number);
    const activeRoles = MOCK_ROLES.filter(r => user.roles.includes(r.id));
    user.roleNames = activeRoles.map(r => r.name);
    user.role = user.roleNames[0] || "viewer";
    const perms = new Set();
    for (const r of activeRoles) {
      r.permissions.forEach(p => perms.add(p));
    }
    user.effectivePerms = Array.from(perms);
  }
  return ok(res, user);
});

app.patch("/api/users/:id/permissions", (req, res) => {
  const user = MOCK_USERS.find(u => u.id === parseInt(req.params.id, 10));
  if (!user) return fail(res, 404, "NOT_FOUND", "User not found");
  const { allow, deny } = req.body || {};
  const basePerms = new Set();
  const activeRoles = MOCK_ROLES.filter(r => user.roles.includes(r.id));
  for (const r of activeRoles) {
    r.permissions.forEach(p => basePerms.add(p));
  }
  if (allow) allow.forEach(p => basePerms.add(p));
  if (deny) deny.forEach(p => basePerms.delete(p));
  user.effectivePerms = Array.from(basePerms);
  return ok(res, user);
});

app.patch("/api/users/:id/branch-scope", (req, res) => {
  const user = MOCK_USERS.find(u => u.id === parseInt(req.params.id, 10));
  if (!user) return fail(res, 404, "NOT_FOUND", "User not found");
  const { branch_ids } = req.body || {};
  if (branch_ids) {
    user.scopeBranches = branch_ids.map(String);
    user.isAllBranches = user.scopeBranches.length === 0;
  }
  return ok(res, user);
});

app.post("/api/users/:id/reset-password", (req, res) => {
  const user = MOCK_USERS.find(u => u.id === parseInt(req.params.id, 10));
  if (!user) return fail(res, 404, "NOT_FOUND", "User not found");
  return ok(res, { success: true, message: "Password reset successfully" });
});

app.delete("/api/users/:id", (req, res) => {
  const idx = MOCK_USERS.findIndex(u => u.id === parseInt(req.params.id, 10));
  if (idx === -1) return fail(res, 404, "NOT_FOUND", "User not found");
  MOCK_USERS.splice(idx, 1);
  return ok(res, { deleted: true });
});

// ─── Role Management Endpoints ─────────────────────────────────────────────────
app.get("/api/roles", (req, res) => {
  return ok(res, MOCK_ROLES);
});

app.get("/api/roles/:id", (req, res) => {
  const role = MOCK_ROLES.find(r => r.id === parseInt(req.params.id, 10));
  if (!role) return fail(res, 404, "NOT_FOUND", "Role not found");
  return ok(res, role);
});

app.post("/api/roles", (req, res) => {
  const { name, label, description, permissions } = req.body || {};
  if (!name || !label) return fail(res, 400, "BAD_REQUEST", "Name and label are required");
  const newRole = {
    id: MOCK_ROLES.length + 1,
    name,
    label,
    description: description || "",
    permissions: permissions || []
  };
  MOCK_ROLES.push(newRole);
  return ok(res, newRole);
});

app.put("/api/roles/:id", (req, res) => {
  const role = MOCK_ROLES.find(r => r.id === parseInt(req.params.id, 10));
  if (!role) return fail(res, 404, "NOT_FOUND", "Role not found");
  const { label, description, permissions } = req.body || {};
  if (label) role.label = label;
  if (description !== undefined) role.description = description;
  if (permissions) role.permissions = permissions;
  return ok(res, role);
});

app.delete("/api/roles/:id", (req, res) => {
  const idx = MOCK_ROLES.findIndex(r => r.id === parseInt(req.params.id, 10));
  if (idx === -1) return fail(res, 404, "NOT_FOUND", "Role not found");
  MOCK_ROLES.splice(idx, 1);
  return ok(res, { deleted: true });
});

// ─── System Branches Endpoint ──────────────────────────────────────────────────
app.get("/api/system/branches", (req, res) => {
  return ok(res, BRANCHES);
});


// ─── Root ──────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "Enterprise Operations Monitor - Mock API", version: "2.0.0" });
});

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Mock API running on http://localhost:${PORT}`);
  console.log(`Stores seeded: ${STORES.length} across ${BRANCHES.length} branches`);
  console.log(`Backups seeded: ${backupFiles.length}`);
});
