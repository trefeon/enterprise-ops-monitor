module.exports = (sequelize, DataTypes) => {
  const EODLog = sequelize.define(
    "EODLog",
    {
      store_code: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("DONE", "PENDING", "FAILED"),
        defaultValue: "PENDING",
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      source: {
        type: DataTypes.STRING, // 'BOT', 'MANUAL', 'API'
        defaultValue: "API",
      },
      synced_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      indexes: [{ unique: true, fields: ["store_code", "date"] }],
    }
  );

  return EODLog;
};
