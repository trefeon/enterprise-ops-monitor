/**
 * Migration runner script
 * Run with: node migrations/run.js
 */
const path = require("path");
const fs = require("fs");
const { Sequelize } = require("sequelize");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const DATABASE_URL = process.env.DATABASE_URL;

const sequelize = DATABASE_URL
  ? new Sequelize(DATABASE_URL, { dialect: "postgres", logging: false })
  : new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
      host: process.env.DB_HOST || "db",
      dialect: "postgres",
      logging: false,
    });

async function ensureMigrationsTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name VARCHAR(255) PRIMARY KEY,
      ran_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function getRanMigrations() {
  const [rows] = await sequelize.query("SELECT name FROM _migrations ORDER BY name;");
  return new Set(rows.map((r) => r.name));
}

async function markMigrationRan(name) {
  await sequelize.query("INSERT INTO _migrations (name) VALUES (:name);", {
    replacements: { name },
  });
}

async function run() {
  try {
    await sequelize.authenticate();
    console.log("✓ Database connected");

    await ensureMigrationsTable();
    const ran = await getRanMigrations();

    const migrationsDir = __dirname;
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".js") && f !== "run.js")
      .sort();

    let applied = 0;
    for (const file of files) {
      if (ran.has(file)) {
        console.log(`  ○ ${file} (already ran)`);
        continue;
      }

      console.log(`  → Running ${file}...`);
      const migration = require(path.join(migrationsDir, file));
      await migration.up(sequelize.getQueryInterface(), Sequelize);
      await markMigrationRan(file);
      console.log(`  ✓ ${file} applied`);
      applied++;
    }

    if (applied === 0) {
      console.log("✓ No pending migrations");
    } else {
      console.log(`✓ Applied ${applied} migration(s)`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

run();
