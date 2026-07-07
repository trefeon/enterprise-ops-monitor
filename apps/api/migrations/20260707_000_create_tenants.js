"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("tenants", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.fn("gen_random_uuid"),
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      slug: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true,
      },
      settings_json: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("now"),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("now"),
      },
    });

    await queryInterface.createTable("user_identities", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.fn("gen_random_uuid"),
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      provider: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      provider_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("now"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("now"),
      },
    });

    await queryInterface.addConstraint("user_identities", {
      fields: ["provider", "provider_id"],
      type: "unique",
      name: "uq_user_identities_provider_provider_id",
    });
  },

  down: async (queryInterface, _Sequelize) => {
    await queryInterface.dropTable("user_identities");
    await queryInterface.dropTable("tenants");
  },
};
// WAVE A COMPLETE — 20260707_000_create_tenants.js
