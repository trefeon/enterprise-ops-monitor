const { toWibDate } = require("../utils/time");
const { normalizeBranchName } = require("../utils/branchNames");

const BRANCHES = [
  { code: "302", id: "2", name: "NORTH HUB" },
  { code: "303", id: "3", name: "EAST HUB" },
  { code: "304", id: "4", name: "CENTRAL HUB" },
  { code: "305", id: "5", name: "COASTAL HUB" },
  { code: "306", id: "6", name: "HIGHLAND HUB" },
  { code: "307", id: "7", name: "WEST HUB" },
  { code: "308", id: "8", name: "RIVER HUB" },
  { code: "309", id: "9", name: "SOUTH HUB" },
];

const BRANCH_IDS = BRANCHES.map((branch) => branch.id);
const BRANCH_BY_ID = new Map(BRANCHES.map((branch) => [String(branch.id), branch]));
const BRANCH_BY_CODE = new Map(BRANCHES.map((branch) => [String(branch.code), branch]));

function inferBranchFromStoreCode(storeCode) {
  if (!storeCode) return null;

  const match = String(storeCode).trim().match(/^(\d{3})/);
  if (!match) return null;

  return BRANCH_BY_CODE.get(match[1]) || null;
}

const DATA_EOD_API_URL =
  process.env.DATA_EOD_API_URL || process.env.EOD_API_URL || "https://internal-data-api.example.com/notif_eod";
const DATA_EMPLOYEE_API_URL =
  process.env.DATA_EMPLOYEE_API_URL ||
  process.env.NIK_API_URL ||
  "https://internal-data-api.example.com/nik_toko";

const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.DATA_API_TIMEOUT_MS || "120000", 10);
const DEFAULT_RETRY_ATTEMPTS = Number.parseInt(process.env.DATA_API_RETRY_ATTEMPTS || "2", 10);
const DEFAULT_RETRY_BASE_MS = Number.parseInt(process.env.DATA_API_RETRY_BASE_MS || "1000", 10);
const DEFAULT_RETRY_MAX_MS = Number.parseInt(process.env.DATA_API_RETRY_MAX_MS || "8000", 10);
const DEFAULT_RETRY_JITTER_MS = Number.parseInt(process.env.DATA_API_RETRY_JITTER_MS || "250", 10);
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const EOD_CACHE_TTL_MS = Number.parseInt(process.env.DATA_EOD_CACHE_TTL_MS || "300000", 10);
const EMPLOYEE_CACHE_TTL_MS = Number.parseInt(
  process.env.DATA_EMPLOYEE_CACHE_TTL_MS || "900000",
  10
);

const cache = new Map();
const inFlight = new Map();

function getBranchNameById(id) {
  return BRANCH_BY_ID.get(String(id))?.name || null;
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value, ttlMs) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

async function cachedFetch(key, ttlMs, fetcher, { bypassCache = false } = {}) {
  if (!bypassCache) {
    const cached = getCached(key);
    if (cached) return cached;
    if (inFlight.has(key)) return inFlight.get(key);
  }

  const promise = (async () => {
    const data = await fetcher();
    setCached(key, data, ttlMs);
    return data;
  })();

  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

async function postJson(url, payload, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      const error = new Error(`Internal data API request failed (${res.status}): ${text}`);
      error.status = res.status;
      error.responseBody = text;
      error.retryAfterMs = parseRetryAfterMs(res.headers?.get?.("retry-after"));
      throw error;
    }

    const data = await res.json();
    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error(`Internal data API request timeout after ${timeoutMs}ms`);
      timeoutError.code = "DATA_TIMEOUT";
      timeoutError.retryable = true;
      timeoutError.cause = error;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function mapConcurrent(items, concurrency, fn) {
  const results = [];
  const iterator = items.entries();
  const workers = new Array(Math.min(concurrency, items.length))
    .fill(iterator)
    .map(async (iter) => {
      for (const [index, item] of iter) {
        results[index] = await fn(item);
      }
    });
  await Promise.all(workers);
  return results;
}

function parseRetryAfterMs(retryAfterValue) {
  if (!retryAfterValue) return null;

  const raw = String(retryAfterValue).trim();
  if (!raw) return null;

  const numericSeconds = Number.parseInt(raw, 10);
  if (Number.isFinite(numericSeconds) && numericSeconds >= 0) {
    return numericSeconds * 1000;
  }

  const dateValue = new Date(raw);
  if (Number.isNaN(dateValue.getTime())) return null;

  const delayMs = dateValue.getTime() - Date.now();
  if (!Number.isFinite(delayMs) || delayMs <= 0) return null;
  return delayMs;
}

function sleep(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableDataApiError(error) {
  if (!error) return false;
  if (error.retryable === false) return false;
  if (typeof error.status === "number") return RETRYABLE_STATUS_CODES.has(error.status);
  if (error.code === "DATA_TIMEOUT") return true;

  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("fetch failed") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("temporarily unavailable") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("socket hang up")
  );
}

function computeRetryDelayMs({
  retryNumber,
  retryBaseMs,
  retryMaxMs,
  retryJitterMs,
  retryAfterMs,
}) {
  const exponent = Math.max(0, retryNumber - 1);
  const baseDelay = Math.min(retryMaxMs, retryBaseMs * 2 ** exponent);
  const jitter = retryJitterMs > 0 ? Math.floor(Math.random() * (retryJitterMs + 1)) : 0;
  const preferredDelay = Number.isFinite(retryAfterMs)
    ? Math.max(baseDelay, retryAfterMs)
    : baseDelay;
  return Math.min(retryMaxMs, preferredDelay + jitter);
}

function describeRetryReason(error) {
  if (!error) return "unknown error";
  if (typeof error.status === "number") return `status=${error.status}`;
  if (error.code) return `code=${error.code}`;
  return error.message || "unknown error";
}

async function fetchBranchData(url, branchId, options = {}) {
  const timeoutMs = Number.parseInt(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, 10);
  const retryAttempts = Number.parseInt(options.retryAttempts ?? DEFAULT_RETRY_ATTEMPTS, 10);
  const retryBaseMs = Number.parseInt(options.retryBaseMs ?? DEFAULT_RETRY_BASE_MS, 10);
  const retryMaxMs = Number.parseInt(options.retryMaxMs ?? DEFAULT_RETRY_MAX_MS, 10);
  const retryJitterMs = Number.parseInt(options.retryJitterMs ?? DEFAULT_RETRY_JITTER_MS, 10);
  const requestLabel = options.requestLabel || "fetch";

  const payload = { branch: String(branchId) };
  const totalAttempts = Math.max(1, retryAttempts + 1);
  let lastError = null;
  let attemptsUsed = 0;

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    attemptsUsed = attempt;
    try {
      const data = await postJson(url, payload, timeoutMs);
      if (Array.isArray(data)) return data;

      // Some internal data API endpoints can return `{ data: [...] }`.
      // Treat that as valid; otherwise fail-fast so callers can surface branchErrors.
      if (data && typeof data === "object" && Array.isArray(data.data)) return data.data;

      throw new Error(`Unexpected internal data API response shape for branch ${branchId}`);
    } catch (error) {
      lastError = error;
      const shouldRetry = attempt < totalAttempts && isRetryableDataApiError(error);
      if (!shouldRetry) break;

      const delayMs = computeRetryDelayMs({
        retryNumber: attempt,
        retryBaseMs,
        retryMaxMs,
        retryJitterMs,
        retryAfterMs: error?.retryAfterMs,
      });
      console.warn(
        `[DataAPI] ${requestLabel} retrying branch ${branchId}: attempt ${attempt + 1}/${totalAttempts} in ${delayMs}ms (${describeRetryReason(error)})`
      );
      await sleep(delayMs);
    }
  }

  if (lastError && attemptsUsed > 1) {
    const wrappedError = new Error(
      `${lastError?.message || String(lastError)} (after ${attemptsUsed} attempt(s))`
    );
    wrappedError.cause = lastError;
    wrappedError.status = lastError.status;
    wrappedError.code = lastError.code;
    throw wrappedError;
  }

  throw lastError || new Error(`Internal data API fetch failed for branch ${branchId}`);
}

function parsePercent(value) {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  const parsed = Number.parseFloat(String(value).replace("%", "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  // Internal data API endpoints return RFC1123 strings suffixed with "GMT", but the timestamp is often WIB.
  // Heuristic: if parsing as GMT yields a time far in the future, reinterpret as WIB (+07:00).
  if (/\sGMT$/i.test(raw)) {
    const FUTURE_SKEW_MS = 30 * 60 * 1000; // tolerate small clock skew
    if (parsed.getTime() - Date.now() > FUTURE_SKEW_MS) {
      const wibCandidate = raw.replace(/\sGMT$/i, " +07:00");
      const parsedWib = new Date(wibCandidate);
      if (!Number.isNaN(parsedWib.getTime())) return parsedWib;
    }
  }

  return parsed;
}

function normalizeEodRow(raw) {
  const storeCode = raw?.kodetoko ?? raw?.kodeToko ?? raw?.storeCode;
  const inferredBranch = inferBranchFromStoreCode(storeCode);
  const branchId = inferredBranch?.id || String(raw?.idcabang ?? raw?.idCabang ?? raw?.branchId ?? "");
  const branchName = normalizeBranchName(
    inferredBranch?.name || raw?.namaCabang || raw?.branchName || getBranchNameById(branchId)
  );
  const storeName = raw?.namatoko ?? raw?.namaToko ?? raw?.storeName;

  const statusSales = String(raw?.statussales || "").trim();
  const uploadPercent = parsePercent(raw?.persentaseuploadstok);
  const maxUploadAt = parseDate(raw?.maxupload);
  const now = new Date();

  const isComplete = statusSales.toLowerCase() === "ok" && uploadPercent >= 100;
  let status = "pending";
  if (isComplete) status = "done";
  else if (maxUploadAt && now > maxUploadAt) status = "failed";

  return {
    storeCode: storeCode != null ? String(storeCode) : null,
    storeName: storeName != null ? String(storeName) : null,
    branchId,
    branchName,
    area: raw?.area || null,
    regional: raw?.regional || null,
    nikAc: raw?.nikac || null,
    nikRh: raw?.NikRH || raw?.nik_rh || raw?.nikrh || null,
    statusSales: statusSales || null,
    uploadPercent,
    businessDate: toWibDate(raw?.tglbisnis),
    eodAt: parseDate(raw?.tgleod),
    uploadAt: parseDate(raw?.tglupload),
    maxUploadAt,
    status,
    raw,
  };
}

function normalizeEmployeeRow(raw) {
  const storeCode = raw?.kodeToko ?? raw?.kodetoko ?? raw?.storeCode;
  const inferredBranch = inferBranchFromStoreCode(storeCode);
  const branchId = inferredBranch?.id || String(raw?.idCabang ?? raw?.idcabang ?? raw?.branchId ?? "");
  const branchName = normalizeBranchName(
    inferredBranch?.name || raw?.namaCabang || raw?.branchName || getBranchNameById(branchId)
  );

  return {
    empid: raw?.empid != null ? String(raw.empid) : null,
    name: raw?.name || raw?.fullName || null,
    jobName: raw?.job_name || raw?.jobName || null,
    storeCode: storeCode != null ? String(storeCode) : null,
    branchId,
    branchName,
    storeName: raw?.namaToko || raw?.namatoko || null,
    raw,
  };
}

function inferBusinessDate(rows) {
  for (const row of rows) {
    if (row.businessDate) return row.businessDate;
  }
  return toWibDate();
}

async function fetchEodAllBranches(options = {}) {
  return cachedFetch(
    "data:eod:all",
    EOD_CACHE_TTL_MS,
    async () => {
      const branchErrors = [];
      const responses = [];

      // Fetch with limited concurrency to balance speed and upstream stability
      const results = await mapConcurrent(BRANCHES, 3, async (branch) => {
        try {
          const items = await fetchBranchData(DATA_EOD_API_URL, branch.id, { requestLabel: "EOD" });
          return {
            success: true,
            data: items.map((item) => ({
              ...item,
              branchId: branch.id,
              branchName: branch.name,
            })),
          };
        } catch (error) {
          const message = error?.message || String(error);
          console.error(`[DataAPI] EOD fetch failed for branch ${branch.id}:`, message);
          return {
            success: false,
            error: {
              branchId: String(branch.id),
              branchName: branch.name,
              message,
            },
          };
        }
      });

      for (const res of results) {
        if (res.success) {
          responses.push(res.data);
        } else {
          branchErrors.push(res.error);
        }
      }

      const rows = responses.flat().map(normalizeEodRow);
      return {
        rows,
        businessDate: inferBusinessDate(rows),
        fetchedAt: new Date().toISOString(),
        branchErrors,
      };
    },
    options
  );
}

async function fetchEmployeesAllBranches(options = {}) {
  return cachedFetch(
    "data:employees:all",
    EMPLOYEE_CACHE_TTL_MS,
    async () => {
      const branchErrors = [];
      const responses = [];

      // Fetch with limited concurrency to balance speed and upstream stability
      const results = await mapConcurrent(BRANCHES, 3, async (branch) => {
        try {
          const items = await fetchBranchData(DATA_EMPLOYEE_API_URL, branch.id, {
            requestLabel: "Employee",
          });
          return {
            success: true,
            data: items.map((item) => ({
              ...item,
              branchId: branch.id,
              branchName: branch.name,
            })),
          };
        } catch (error) {
          const message = error?.message || String(error);
          console.error(`[DataAPI] Employee fetch failed for branch ${branch.id}:`, message);
          return {
            success: false,
            error: {
              branchId: String(branch.id),
              branchName: branch.name,
              message,
            },
          };
        }
      });

      for (const res of results) {
        if (res.success) {
          responses.push(res.data);
        } else {
          branchErrors.push(res.error);
        }
      }

      const rows = responses.flat().map(normalizeEmployeeRow);
      return {
        rows,
        fetchedAt: new Date().toISOString(),
        branchErrors,
      };
    },
    options
  );
}

function invalidateEodCache() {
  cache.delete("data:eod:all");
}

function invalidateEmployeeCache() {
  cache.delete("data:employees:all");
}

// ─── Store Sync Audit ────────────────────────────────────────────────────────
const DATA_SYNC_AUD_API_URL =
  process.env.DATA_SYNC_AUD_API_URL || "https://internal-data-api.example.com/sync_aud";
const SYNC_CACHE_TTL_MS = Number.parseInt(process.env.DATA_SYNC_CACHE_TTL_MS || "30000", 10);
const STALE_THRESHOLD_MS = Number.parseInt(process.env.DATA_SYNC_STALE_THRESHOLD_MS || "600000", 10); // 10 minutes

function normalizeStoreSyncRow(raw, branchId, branchName) {
  const storeCode = raw?.kodetoko != null ? String(raw.kodetoko).trim() : null;
  const inferredBranch = inferBranchFromStoreCode(storeCode);
  const lastSyncDate = parseDate(raw?.lastSync);
  const lastSyncWib = lastSyncDate ? toWibDate(lastSyncDate) : null;
  const now = new Date();
  const lastSyncAgoMs = lastSyncDate ? now - lastSyncDate : null;
  const isMissingToday = !lastSyncWib || lastSyncWib !== toWibDate();

  return {
    storeCode,
    storeName: raw?.namaToko || null,
    branchId: inferredBranch?.id || branchId,
    branchName: inferredBranch?.name || branchName,
    lastSyncAt: lastSyncDate ? lastSyncDate.toISOString() : null,
    lastSyncAgoSec: lastSyncAgoMs != null ? Math.floor(lastSyncAgoMs / 1000) : null,
    isMissingToday,
  };
}

async function fetchStoreSyncAllBranches(options = {}) {
  return cachedFetch(
    "data:sync:all",
    SYNC_CACHE_TTL_MS,
    async () => {
      const branchErrors = [];
      const rows = [];

      // IMPORTANT: this endpoint behaves inconsistently when hit in parallel.
      // Fetch branches sequentially to avoid cross-branch duplication/missing data.
      for (const branch of BRANCHES) {
        try {
          const items = await fetchBranchData(DATA_SYNC_AUD_API_URL, branch.id, {
            requestLabel: "Sync",
          });
          rows.push(...items.map((item) => normalizeStoreSyncRow(item, branch.id, branch.name)));
        } catch (error) {
          const message = error?.message || String(error);
          branchErrors.push({ branchId: String(branch.id), branchName: branch.name, message });
          console.error(`[DataAPI] Sync fetch failed for branch ${branch.id}:`, message);
        }
      }

      const byStore = new Map();
      for (const row of rows) {
        if (!row.storeCode) continue;
        const existing = byStore.get(row.storeCode);
        if (!existing) {
          byStore.set(row.storeCode, row);
          continue;
        }
        const existingTime = existing.lastSyncAt ? new Date(existing.lastSyncAt) : null;
        const nextTime = row.lastSyncAt ? new Date(row.lastSyncAt) : null;
        if (nextTime && (!existingTime || nextTime > existingTime)) {
          byStore.set(row.storeCode, row);
        }
      }

      const dedupedRows = Array.from(byStore.values());

      return {
        rows: dedupedRows,
        total: dedupedRows.length,
        fetchedAt: new Date().toISOString(),
        branchErrors,
      };
    },
    options
  );
}

function invalidateSyncCache() {
  cache.delete("data:sync:all");
}

module.exports = {
  BRANCHES,
  BRANCH_IDS,
  inferBranchFromStoreCode,
  getBranchNameById,
  fetchEodAllBranches,
  fetchEmployeesAllBranches,
  invalidateEodCache,
  invalidateEmployeeCache,
  fetchStoreSyncAllBranches,
  invalidateSyncCache,
  DATA_SYNC_AUD_API_URL,
  STALE_THRESHOLD_MS,
};
