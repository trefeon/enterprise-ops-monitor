"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("agent_monitoring", "status_message", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("agent_monitoring", "last_error", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("agent_monitoring", "update_requested", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  down: async (queryInterface, _Sequelize) => {
    await queryInterface.removeColumn("agent_monitoring", "update_requested");
    await queryInterface.removeColumn("agent_monitoring", "last_error");
    await queryInterface.removeColumn("agent_monitoring", "status_message");
  },
};
