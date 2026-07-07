module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: "user", // 'admin', 'user'
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: "active", // 'active', 'invited', 'disabled'
    },
    invite_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    org_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  });
  return User;
};
