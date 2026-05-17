/**
 * Detect the "no data" dashboard state.
 *
 * We treat this as: no stores, no EOD counts, no employees, and no sync timestamps.
 * This typically means the DB tables are empty (fresh install) or the upstream sync hasn't run yet.
 */
export const hasNoDashboardData = (summary) => {
  if (!summary) return true;

  const storesTotal = Number(summary.storesTotal ?? 0);
  const eod = summary.eod || {};
  const employees = summary.employees || {};

  const done = Number(eod.done ?? 0);
  const pending = Number(eod.pending ?? 0);
  const failed = Number(eod.failed ?? 0);

  const employeesTotal = Number(employees.total ?? 0);

  const hasAnySyncTimestamp = Boolean(eod.lastSyncAt) || Boolean(employees.syncedAt);
  const hasAnyCounts = storesTotal > 0 || done + pending + failed > 0 || employeesTotal > 0;

  return !hasAnyCounts && !hasAnySyncTimestamp;
};
