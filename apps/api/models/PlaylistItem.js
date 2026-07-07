module.exports = (sequelize, DataTypes) => {
  const PlaylistItem = sequelize.define(
    "PlaylistItem",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      playlist_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      media_asset_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      duration_sec: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "playlist_items",
      timestamps: false,
    }
  );

  PlaylistItem.associate = function associate(models) {
    PlaylistItem.belongsTo(models.Playlist, {
      foreignKey: "playlist_id",
      as: "playlist",
    });
    PlaylistItem.belongsTo(models.MediaAsset, {
      foreignKey: "media_asset_id",
      as: "mediaAsset",
    });
  };

  return PlaylistItem;
};
/* model: PlaylistItem */
