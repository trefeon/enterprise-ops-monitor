module.exports = (sequelize, DataTypes) => {
  const SyncAlertState = sequelize.define(
    "SyncAlertState",
    {
      store_code: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
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
      stale_since: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      last_seen_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      last_alerted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      last_recovered_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      indexes: [
        { fields: ["is_stale"] },
        { fields: ["is_problem"] },
        { fields: ["last_alerted_at"] },
        { fields: ["last_seen_at"] },
      ],
    }
  );

  return SyncAlertState;
};
