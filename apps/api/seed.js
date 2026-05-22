require("dotenv").config();
const db = require("./models");
const ensureDefaultUsers = require("./utils/ensureDefaultUsers");

async function seed() {
  try {
    // Use alter instead of force to preserve existing data
    await db.sequelize.sync({ alter: true });
    console.log("Database synced (alter: true - preserves existing data)");

    // 1. Create default users (securely via ensureDefaultUsers)
    try {
      const userResult = await ensureDefaultUsers();
      if (userResult.enabled) {
        const summary = (userResult.results || [])
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
        console.log(`Default users ensured: ${summary}`);
      } else {
        console.log(
          "Default users skipped (DEFAULT_USERS_ENABLED not set or missing credentials in .env)."
        );
      }
    } catch (e) {
      console.warn("ensureDefaultUsers failed:", e.message);
    }

    // 2. Create Stores (findOrCreate to avoid duplicates)
    let storesCreated = 0;
    for (let i = 1; i <= 20; i++) {
      const storeData = {
        store_code: `${100000 + i}`,
        store_name: `Demo Retail Store ${100000 + i}`,
        area: i <= 5 ? "Zone Alpha" : i <= 10 ? "Zone Beta" : "Zone Gamma",
        region: "Region A",
        is_active: true,
      };
      const [, created] = await db.Store.findOrCreate({
        where: { store_code: storeData.store_code },
        defaults: storeData,
      });
      if (created) storesCreated++;
    }
    console.log(`${storesCreated} Stores created (${20 - storesCreated} already existed)`);

    // 3. Create EOD Logs (Today)
    const today = new Date().toISOString().split("T")[0];
    const eodLogs = [];
    // 5 Done, 2 Failed, rest Pending (no log)
    for (let i = 1; i <= 5; i++) {
      eodLogs.push({
        store_code: `${100000 + i}`,
        date: today,
        status: "DONE",
        message: "Synced successfully",
        source: "API",
      });
    }
    eodLogs.push({
      store_code: `100006`,
      date: today,
      status: "FAILED",
      message: "Connection Timeout",
      source: "API",
    });
    eodLogs.push({
      store_code: `100007`,
      date: today,
      status: "FAILED",
      message: "Auth Error",
      source: "API",
    });

    await db.EODLog.bulkCreate(eodLogs, { ignoreDuplicates: true });
    console.log("EOD Logs created");

    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const datePrefix = `${yy}${mm}${dd}`;

    // 4. Create Employees
    await db.Employee.bulkCreate(
      [
        {
          nik: `${datePrefix}0001`,
          full_name: "Demo Employee 100001-01",
          role: "Manager",
          store_code: "100001",
          status: "ACTIVE",
        },
        {
          nik: `${datePrefix}0002`,
          full_name: "Demo Employee 100001-02",
          role: "Staff",
          store_code: "100001",
          status: "ACTIVE",
        },
        {
          nik: `${datePrefix}0003`,
          full_name: "Demo Employee 100002-01",
          role: "Staff",
          store_code: "100002",
          status: "INACTIVE",
        },
      ],
      { ignoreDuplicates: true }
    );
    console.log("Employees created");

    // 5. Create Backups
    await db.BackupLog.bulkCreate(
      [
        {
          filename: "backup_20240101.sql",
          type: "SCHEDULED",
          size_bytes: 1024000,
          status: "SUCCESS",
        },
        {
          filename: "backup_20240102.sql",
          type: "SCHEDULED",
          size_bytes: 1025000,
          status: "SUCCESS",
        },
      ],
      { ignoreDuplicates: true }
    );
    console.log("Backups created");

    // 6. Create System Logs
    await db.SystemLog.bulkCreate(
      [
        { level: "INFO", component: "API", message: "Server started" },
        { level: "WARNING", component: "BOT", message: "Bot latency high" },
      ],
      { ignoreDuplicates: true }
    );
    console.log("System logs created");

    console.log("Seeding completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();
