const DEFAULT_MAX_AGE_SECONDS = 180;

async function upsertServiceHeartbeat(sequelize, serviceName) {
  if (!sequelize || !serviceName) return;
  try {
    await sequelize.query(
      `INSERT INTO service_heartbeats (service_name, last_seen_at, updated_at)
       VALUES ($1, NOW(), NOW())
       ON CONFLICT (service_name)
       DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at, updated_at = NOW();`,
      { bind: [serviceName] }
    );
  } catch (_) {
    // Ignore missing table / transient DB issues; health will degrade accordingly.
  }
}

async function getServiceHeartbeat(sequelize, serviceName) {
  if (!sequelize || !serviceName) return null;
  try {
    const [rows] = await sequelize.query(
      `SELECT (last_seen_at AT TIME ZONE 'UTC') AS last_seen_at
       FROM service_heartbeats
       WHERE service_name = $1
       LIMIT 1;`,
      { bind: [serviceName] }
    );

    const ts = Array.isArray(rows) && rows.length > 0 ? rows[0]?.last_seen_at : null;
    if (!ts) return null;
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch (_) {
    return null;
  }
}

function heartbeatStatus(lastSeenAt, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) {
  if (!lastSeenAt) return { status: "UNKNOWN", lastSeenAt: null };
  const ageSeconds = (Date.now() - lastSeenAt.getTime()) / 1000;
  return {
    status: ageSeconds < maxAgeSeconds ? "ONLINE" : "DEGRADED",
    lastSeenAt,
  };
}

module.exports = {
  upsertServiceHeartbeat,
  getServiceHeartbeat,
  heartbeatStatus,
};
