const { toWibIso } = require("../../utils/time");

function buildExternalMeta({
  source,
  sourceFetchedAt,
  partial = false,
  warnings = [],
  updatedAt = null,
} = {}) {
  const fetchedAtDate = sourceFetchedAt ? new Date(sourceFetchedAt) : null;
  const fetchedAtMs =
    fetchedAtDate && !Number.isNaN(fetchedAtDate.getTime()) ? fetchedAtDate.getTime() : null;
  const lagSec =
    fetchedAtMs != null ? Math.max(0, Math.floor((Date.now() - fetchedAtMs) / 1000)) : null;

  const updatedAtValue =
    updatedAt || (sourceFetchedAt ? toWibIso(sourceFetchedAt) : toWibIso(new Date()));

  return {
    updatedAt: updatedAtValue,
    source: source || "unknown",
    sourceFetchedAt: sourceFetchedAt ? toWibIso(sourceFetchedAt) || sourceFetchedAt : null,
    sourceLagSec: lagSec,
    partial: Boolean(partial),
    warnings: Array.isArray(warnings) ? warnings : [],
  };
}

module.exports = {
  buildExternalMeta,
};
