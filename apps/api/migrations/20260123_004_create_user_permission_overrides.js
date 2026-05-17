"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create ENUM type first
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE permission_effect AS ENUM ('allow', 'deny');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.createTable("user_permission_overrides", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      permission: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      effect: {
        type: Sequelize.ENUM("allow", "deny"),
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("user_permission_overrides", ["user_id", "permission"], {
      unique: true,
      name: "user_permission_overrides_user_id_permission_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("user_permission_overrides");
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS permission_effect;");
  },
};
