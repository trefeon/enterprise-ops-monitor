const { v4: uuidv4 } = require("uuid");

module.exports = (sequelize, DataTypes) => {
  const Screen = sequelize.define(
    "Screen",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      org_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      token: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      logo_url: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "branding_logo_url",
      },
      primary_color: {
        type: DataTypes.STRING(7),
        allowNull: true,
        field: "branding_primary_color",
      },
    },
    {
      tableName: "screens",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  /**
   * Generate a new UUID token for the screen.
   */
  Screen.generateToken = function generateToken() {
    return uuidv4();
  };

  return Screen;
};
/* model: Screen */
