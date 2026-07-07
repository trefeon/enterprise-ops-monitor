module.exports = (sequelize, DataTypes) => {
  const MediaAsset = sequelize.define(
    "MediaAsset",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      org_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      uploaded_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      filename: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      original_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      mime_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      file_size_bytes: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      storage_path: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      thumb_path: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      duration_sec: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      width: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      height: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "media_assets",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return MediaAsset;
};
/* model: MediaAsset */
