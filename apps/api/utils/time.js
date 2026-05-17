const WIB_TZ = "Asia/Jakarta";

const formatParts = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  // Note: Some locales (e.g. en-CA/en-US) can format 00:xx as "24:xx" (hour cycle),
  // which breaks time-of-day logic. Use a locale that yields "00" for midnight.
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: WIB_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const map = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }
  return map;
};

const toWibIso = (date) => {
  const map = formatParts(date);
  if (!map) return null;

  // Defensive: some runtimes/locales can still yield hour "24" for 00:xx.
  // Treat that as 00:xx on the same date.
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  const pad = (n) => String(n).padStart(2, "0");
  return `${map.year}-${map.month}-${map.day}T${pad(hour)}:${map.minute}:${map.second}+07:00`;
};

const toWibDate = (date = new Date()) => {
  const map = formatParts(date);
  if (!map) return null;
  return `${map.year}-${map.month}-${map.day}`;
};

// Business date rule for Enterprise Ops Monitor EOD:
// - Between 00:00 and 19:29 WIB: show yesterday (today's EOD hasn't started)
// - Between 19:30 and 23:59 WIB: show today
const getEffectiveBusinessDate = (
  date = new Date(),
  { cutoffHour = 19, cutoffMinute = 30 } = {}
) => {
  const map = formatParts(date);
  if (!map) return null;

  const hour = Number.parseInt(map.hour, 10);
  const minute = Number.parseInt(map.minute, 10);

  const isBeforeCutoff = hour < cutoffHour || (hour === cutoffHour && minute < cutoffMinute);
  if (!isBeforeCutoff) {
    return `${map.year}-${map.month}-${map.day}`;
  }

  // Compute yesterday in WIB by subtracting 24h from the input time.
  const prev = new Date(new Date(date).getTime() - 24 * 60 * 60 * 1000);
  return toWibDate(prev);
};

module.exports = {
  WIB_TZ,
  toWibIso,
  toWibDate,
  getEffectiveBusinessDate,
};
