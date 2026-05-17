module.exports = (sequelize, DataTypes) => {
  const UserRole = sequelize.define(
    "UserRole",
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
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "user_roles",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["user_id", "role_id"],
        },
      ],
    }
  );

  UserRole.associate = (models) => {
    UserRole.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    UserRole.belongsTo(models.Role, { foreignKey: "role_id", as: "role" });
  };

  return UserRole;
};
