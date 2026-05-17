const { WIB_TZ } = require("../../utils/time");

function getWibHourMinute() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: WIB_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const map = {};
  for (const p of parts) map[p.type] = p.value;

  const hour = Number.parseInt(map.hour || "0", 10);
  const minute = Number.parseInt(map.minute || "0", 10);

  return {
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

function eodTtlMsNow() {
  const { hour } = getWibHourMinute();

  // Daytime: 15–30 minutes
  if (hour < 16) return 20 * 60 * 1000;

  // 16:00–20:00: 5 minutes
  if (hour >= 16 && hour < 20) return 5 * 60 * 1000;

  // 20:00–23:59: 60–120 seconds
  if (hour >= 20 && hour <= 23) return 90 * 1000;

  // Fallback
  return 20 * 60 * 1000;
}

module.exports = {
  eodTtlMsNow,
};
