module.exports = (sequelize, DataTypes) => {
  const RolePermission = sequelize.define(
    "RolePermission",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      permission: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
    },
    {
      tableName: "role_permissions",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["role_id", "permission"],
        },
      ],
    }
  );

  RolePermission.associate = (models) => {
    RolePermission.belongsTo(models.Role, { foreignKey: "role_id", as: "role" });
  };

  return RolePermission;
};
