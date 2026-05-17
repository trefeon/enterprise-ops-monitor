module.exports = (sequelize, DataTypes) => {
  const UserBranchScope = sequelize.define(
    "UserBranchScope",
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
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "user_branch_scopes",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["user_id", "branch_id"],
        },
      ],
    }
  );

  UserBranchScope.associate = (models) => {
    UserBranchScope.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
  };

  return UserBranchScope;
};
