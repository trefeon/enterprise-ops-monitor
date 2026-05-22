/**
 * Startup initialization script.
 * Runs migrations, RBAC seeding, and optional demo data seeding before starting the API server.
 */
const { execSync } = require("child_process");
const logger = require("./utils/logger");

function runInitStep(cmd) {
  try {
    logger.info(`[startup] Running: ${cmd}`);
    execSync(cmd, { stdio: "inherit" });
  } catch (error) {
    logger.error(`[startup] Step failed: ${cmd}`, error.message || error);
    process.exit(1);
  }
}

async function startup() {
  logger.info("[startup] Starting initialization sequence...");

  // 1. Run migrations
  runInitStep("node migrations/run.js");

  // 2. Run RBAC seeding
  runInitStep("node seedRbac.js");

  // 3. Run demo seeding if requested
  if (process.env.SEED_DEMO_DATA === "true") {
    logger.info("[startup] SEED_DEMO_DATA is true, running demo seed...");
    runInitStep("node seed.js");
  } else {
    logger.info("[startup] SEED_DEMO_DATA not set to true, skipping demo data seeding.");
  }

  // 4. Start the application by requiring the main index file
  logger.info("[startup] Launching application server...");
  require("./index.js");
}

startup();
