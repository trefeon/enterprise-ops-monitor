const app = require("./app");
const db = require("./models");
const env = require("./config/env");
const ensureDb = require("./utils/ensureDb");
const ensureDefaultUsers = require("./utils/ensureDefaultUsers");
const { startDataScheduler } = require("./services/dataScheduler");
const logger = require("./utils/logger");

const port = env.PORT;

app.listen(port, async () => {
  try {
    await db.sequelize.authenticate();
    await ensureDb(db);

    // Keep internal data-derived DB tables fresh (optional; controlled by env).
    try {
      startDataScheduler();
    } catch (e) {
      logger.warn("[startup] startDataScheduler failed (non-fatal):", e?.message || e);
    }

    try {
      const seeded = await ensureDefaultUsers();
      if (seeded?.enabled) {
        const summary = (seeded.results || [])
          .map((r) =>
            r?.skipped
              ? `skipped(${r.reason})`
              : r.created
                ? "created"
                : r.updated
                  ? "updated"
                  : "ok"
          )
          .join(", ");
        logger.info(`[startup] Default users ensured: ${summary}`);
      }
    } catch (e) {
      logger.warn("[startup] ensureDefaultUsers failed (non-fatal):", e?.message || e);
    }

    // Sync models (careful in production)
    // await db.sequelize.sync({ alter: true });
  } catch (error) {
    logger.error("Unable to connect to the database:", error);
  }
});
