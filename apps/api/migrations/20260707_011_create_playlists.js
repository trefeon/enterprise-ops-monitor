"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS playlists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES tenants(id),
        branch_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        daypart_config JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS screen_playlists (
        screen_id UUID REFERENCES screens(id) ON DELETE CASCADE,
        playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
        sort_order INT DEFAULT 0,
        PRIMARY KEY (screen_id, playlist_id)
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS playlist_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
        media_asset_id UUID REFERENCES media_assets(id),
        sort_order INT NOT NULL,
        duration_sec INT,
        UNIQUE(playlist_id, sort_order)
      );
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS playlist_items;`);
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS screen_playlists;`);
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS playlists;`);
  },
};
/* migration: 20260707_011_create_playlists */
