const live = require("../dataClient");
const { TTLCache } = require("./cache");
const { eodTtlMsNow } = require("./ttl");
const { buildExternalMeta } = require("./meta");
const { BRANCHES, getBranchNameById, listBranchIds } = require("./branches");

const cache = new TTLCache();

function branchErrorsToWarnings(branchErrors, prefix) {
  const errs = Array.isArray(branchErrors) ? branchErrors : [];
  return errs
    .filter((e) => e && (e.branchId || e.message))
    .map(
      (e) =>
        `${prefix || "branch"} ${String(e.branchId || "?")} failed: ${String(e.message || "error")}`
    );
}

async function fetchEodAllBranches(options = {}) {
  const ttlMs = eodTtlMsNow();
  const { value, source } = await cache.cached(
    "data-gw:eod:all",
    ttlMs,
    async () => {
      // Bypass live service cache so TTL is controlled here.
      return live.fetchEodAllBranches({ ...options, bypassCache: true });
    },
    { bypassCache: Boolean(options?.bypassCache) }
  );

  const warnings = branchErrorsToWarnings(value.branchErrors, "branch");
  const partial = warnings.length > 0;

  return {
    ...value,
    meta: buildExternalMeta({
      source,
      sourceFetchedAt: value.fetchedAt,
      partial,
      warnings,
    }),
  };
}

async function fetchEmployeesAllBranches(options = {}) {
  // Employees change rarely; keep it long.
  const ttlMs = 12 * 60 * 60 * 1000;
  const { value, source } = await cache.cached(
    "data-gw:employees:all",
    ttlMs,
    async () => {
      return live.fetchEmployeesAllBranches({ ...options, bypassCache: true });
    },
    { bypassCache: Boolean(options?.bypassCache) }
  );

  const warnings = branchErrorsToWarnings(value.branchErrors, "branch");
  const partial = warnings.length > 0;

  return {
    ...value,
    meta: buildExternalMeta({
      source,
      sourceFetchedAt: value.fetchedAt,
      partial,
      warnings,
    }),
  };
}

async function fetchSyncAllBranches(options = {}) {
  // sync_aud is flaky under parallel load; dataClient already fetches sequentially.
  const ttlMs = 30 * 1000;
  const { value, source } = await cache.cached(
    "data-gw:sync:all",
    ttlMs,
    async () => {
      return live.fetchStoreSyncAllBranches({ ...options, bypassCache: true });
    },
    { bypassCache: Boolean(options?.bypassCache) }
  );

  const warnings = branchErrorsToWarnings(value.branchErrors, "branch");
  const partial = warnings.length > 0;

  return {
    ...value,
    meta: buildExternalMeta({
      source,
      sourceFetchedAt: value.fetchedAt,
      partial,
      warnings,
    }),
  };
}

function invalidateAll() {
  cache.delete("data-gw:eod:all");
  cache.delete("data-gw:employees:all");
  cache.delete("data-gw:sync:all");
}

module.exports = {
  BRANCHES,
  listBranchIds,
  getBranchNameById,
  fetchEodAllBranches,
  fetchEmployeesAllBranches,
  fetchSyncAllBranches,
  invalidateAll,
};
