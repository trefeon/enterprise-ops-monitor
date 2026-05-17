module.exports = (sequelize, DataTypes) => {
  const AgentMonitoring = sequelize.define(
    "AgentMonitoring",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      store_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      hostname: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      version: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      last_check_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      status_message: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      last_error: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      update_requested: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      script_update_requested: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      worker_version: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      agent_status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "unknown",
      },
    },
    {
      tableName: "agent_monitoring",
      timestamps: true,
      underscored: true,
    }
  );

  return AgentMonitoring;
};
