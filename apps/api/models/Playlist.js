module.exports = (sequelize, DataTypes) => {
  const Playlist = sequelize.define(
    "Playlist",
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
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      daypart_config: {
        type: DataTypes.JSONB,
        defaultValue: {},
      },
    },
    {
      tableName: "playlists",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  Playlist.associate = function associate(models) {
    Playlist.belongsToMany(models.Screen, {
      through: models.ScreenPlaylist,
      foreignKey: "playlist_id",
      otherKey: "screen_id",
      as: "screens",
    });
    Playlist.hasMany(models.PlaylistItem, {
      foreignKey: "playlist_id",
      as: "items",
    });
  };

  return Playlist;
};
/* model: Playlist */
