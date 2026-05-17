module.exports = (sequelize, DataTypes) => {
  const UserPermissionOverride = sequelize.define(
    "UserPermissionOverride",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      permission: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      effect: {
        type: DataTypes.ENUM("allow", "deny"),
        allowNull: false,
      },
    },
    {
      tableName: "user_permission_overrides",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["user_id", "permission"],
        },
      ],
    }
  );

  UserPermissionOverride.associate = (models) => {
    UserPermissionOverride.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
  };

  return UserPermissionOverride;
};
