module.exports = (sequelize, DataTypes) => {
  const Tenant = sequelize.define(
    "Tenant",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      slug: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
      },
      settings_json: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      tableName: "tenants",
      timestamps: true,
      underscored: true,
    }
  );

  return Tenant;
};
// WAVE A COMPLETE — Tenant.js
