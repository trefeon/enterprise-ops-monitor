module.exports = (sequelize, DataTypes) => {
  const SyncLog = sequelize.define(
    "SyncLog",
    {
      store_code: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      store_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      branch_id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      branch_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      last_sync_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      is_stale: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_problem: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_missing_today: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      polled_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      indexes: [
        { fields: ["store_code"] },
        { fields: ["store_code", "polled_at"] },
        { fields: ["branch_id"] },
        { fields: ["branch_id", "polled_at"] },
        { fields: ["polled_at"] },
        { fields: ["is_stale"] },
        { fields: ["is_problem"] },
        { fields: ["is_missing_today"] },
      ],
    }
  );

  return SyncLog;
};
