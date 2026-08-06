module.exports = (sequelize, DataTypes) => {
  const UserIdentity = sequelize.define(
    "UserIdentity",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
      },
      provider: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      provider_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
    },
    {
      tableName: "user_identities",
      timestamps: true,
      indexes: [{ unique: true, fields: ["provider", "provider_id"] }, { fields: ["user_id"] }],
    }
  );

  return UserIdentity;
};
// WAVE A COMPLETE — UserIdentity.js
