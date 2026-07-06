"use strict";

module.exports = {
  async up(queryInterface) {
    // Guard: skip if data_stores / data_employees don't exist yet.
    // These tables are created at runtime by ensureDb.js, not by migrations.
    // On a fresh database, this migration runs before ensureDb, so the tables
    // won't exist. The columns will be added by ensureDb directly instead.
    const [stores] = await queryInterface.sequelize.query(
      `SELECT to_regclass('public.data_stores') AS tbl`
    );
    if (!stores[0]?.tbl) return;

    await queryInterface.sequelize.query(`
      ALTER TABLE data_stores
        ADD COLUMN IF NOT EXISTS address TEXT,
        ADD COLUMN IF NOT EXISTS pic_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50),
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'sync',
        ADD COLUMN IF NOT EXISTS manual_created_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS manual_updated_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS manual_updated_by INTEGER,
        ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

      CREATE INDEX IF NOT EXISTS idx_data_stores_active
        ON data_stores (is_active, store_code);
    `);

    const [employees] = await queryInterface.sequelize.query(
      `SELECT to_regclass('public.data_employees') AS tbl`
    );
    if (!employees[0]?.tbl) return;

    await queryInterface.sequelize.query(`
      ALTER TABLE data_employees
        ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'sync',
        ADD COLUMN IF NOT EXISTS manual_created_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS manual_updated_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS manual_updated_by INTEGER,
        ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

      CREATE INDEX IF NOT EXISTS idx_data_employees_status
        ON data_employees (status, nik);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_data_stores_active;
      DROP INDEX IF EXISTS idx_data_employees_status;

      ALTER TABLE data_stores
        DROP COLUMN IF EXISTS archived_at,
        DROP COLUMN IF EXISTS manual_updated_by,
        DROP COLUMN IF EXISTS manual_updated_at,
        DROP COLUMN IF EXISTS manual_created_at,
        DROP COLUMN IF EXISTS source,
        DROP COLUMN IF EXISTS is_active,
        DROP COLUMN IF EXISTS contact_number,
        DROP COLUMN IF EXISTS pic_name,
        DROP COLUMN IF EXISTS address;

      ALTER TABLE data_employees
        DROP COLUMN IF EXISTS archived_at,
        DROP COLUMN IF EXISTS manual_updated_by,
        DROP COLUMN IF EXISTS manual_updated_at,
        DROP COLUMN IF EXISTS manual_created_at,
        DROP COLUMN IF EXISTS source;
    `);
  },
};
