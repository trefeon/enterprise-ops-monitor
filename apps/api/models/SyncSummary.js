module.exports = (sequelize, DataTypes) => {
  const SyncSummary = sequelize.define(
    "SyncSummary",
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
        allowNull: true,
      },
      branch_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      bucket_start: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      bucket_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10,
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
      },
    },
    {
      indexes: [
        { unique: true, fields: ["store_code", "bucket_start", "bucket_minutes"] },
        { fields: ["store_code", "bucket_start"] },
        { fields: ["bucket_minutes", "bucket_start"] },
        { fields: ["bucket_start"] },
      ],
    }
  );

  return SyncSummary;
};
