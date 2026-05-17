module.exports = (sequelize, DataTypes) => {
  const BackupLog = sequelize.define("BackupLog", {
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("MANUAL", "SCHEDULED"),
      defaultValue: "SCHEDULED",
    },
    size_bytes: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("SUCCESS", "FAILED"),
      defaultValue: "SUCCESS",
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });
  return BackupLog;
};
