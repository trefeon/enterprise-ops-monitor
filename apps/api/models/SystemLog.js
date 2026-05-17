module.exports = (sequelize, DataTypes) => {
  const SystemLog = sequelize.define("SystemLog", {
    level: {
      type: DataTypes.ENUM("INFO", "WARNING", "ERROR", "CRITICAL"),
      defaultValue: "INFO",
    },
    component: {
      type: DataTypes.STRING, // 'DATABASE', 'API', 'BOT', 'SCHEDULER'
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSONB, // Store extra details
      allowNull: true,
    },
  });
  return SystemLog;
};
