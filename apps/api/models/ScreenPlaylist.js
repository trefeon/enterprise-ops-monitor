module.exports = (sequelize, DataTypes) => {
  const ScreenPlaylist = sequelize.define(
    "ScreenPlaylist",
    {
      screen_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
      },
      playlist_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
      },
      sort_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      tableName: "screen_playlists",
      timestamps: false,
    }
  );

  return ScreenPlaylist;
};
/* model: ScreenPlaylist */
