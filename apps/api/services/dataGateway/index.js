const live = require("../dataClient");
const { TTLCache } = require("./cache");
const { eodTtlMsNow } = require("./ttl");
const { buildExternalMeta } = require("./meta");
const { BRANCHES, getBranchNameById, listBranchIds } = require("./branches");

const cache = new TTLCache();

/**
 * Build an org-scoped gateway cache key: `data-gw:{orgId}:{prefix}`. When no
 * org is available (legacy mode) the key is `data-gw:legacy:{prefix}` so
 * different tenants can never share cached payloads once callers pass orgId.
 * @param {string} prefix
 * @param {string|null|undefined} orgId
 */
function orgCacheKey(prefix, orgId) {
  return `data-gw:${orgId || "legacy"}:${prefix}`;
}

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
    orgCacheKey("eod:all", options?.orgId),
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
    orgCacheKey("employees:all", options?.orgId),
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
    orgCacheKey("sync:all", options?.orgId),
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

/**
 * Invalidate the gateway cache for an org (or the legacy keys when orgId is
 * absent). Callers that resolved a tenant should pass options.orgId so stale
 * org-scoped entries are dropped.
 * @param {string|null|undefined} orgId
 */
function invalidateAll(orgId) {
  cache.delete(orgCacheKey("eod:all", orgId));
  cache.delete(orgCacheKey("employees:all", orgId));
  cache.delete(orgCacheKey("sync:all", orgId));
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
