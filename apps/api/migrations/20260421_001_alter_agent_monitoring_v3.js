"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("agent_monitoring", "script_update_requested", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn("agent_monitoring", "worker_version", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("agent_monitoring", "agent_status", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "unknown",
    });
  },

  down: async (queryInterface, _Sequelize) => {
    await queryInterface.removeColumn("agent_monitoring", "agent_status");
    await queryInterface.removeColumn("agent_monitoring", "worker_version");
    await queryInterface.removeColumn("agent_monitoring", "script_update_requested");
  },
};
