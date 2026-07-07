"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS screens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID REFERENCES tenants(id),
        branch_id INT,
        name VARCHAR(255),
        token UUID UNIQUE DEFAULT gen_random_uuid(),
        is_active BOOLEAN DEFAULT true,
        branding_logo_url TEXT,
        branding_primary_color VARCHAR(7),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS screens;`);
  },
};
/* migration: 20260707_010_create_screens */
