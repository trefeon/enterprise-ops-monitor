"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS media_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES tenants(id),
        uploaded_by UUID,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255),
        mime_type VARCHAR(100),
        file_size_bytes BIGINT,
        storage_path TEXT,
        thumb_path TEXT,
        duration_sec INT,
        width INT,
        height INT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS media_assets;`);
  },
};
/* migration: 20260707_012_create_media_assets */
