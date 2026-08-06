const db = require("../models");
const mediaService = require("./mediaService");

/**
 * Fetch the active playlist for a screen by its public token.
 *
 * Returns a summary object with screen name, org name, and playlist items.
 * Each item includes the media type, URL, duration, and dimensions.
 *
 * @param {string} screenToken - UUID token identifying the screen
 * @returns {Promise<Object|null>} { screen: { name }, org: { name }, playlist: { items } } or null
 */
async function getScreenPlaylist(screenToken) {
  // Look up screen by token
  const screen = await db.Screen.findOne({
    where: { token: screenToken, is_active: true },
  });

  if (!screen) return null;

  // Resolve org via raw query (tenants table is not a Sequelize model)
  const org = await db.sequelize.query(`SELECT id, name FROM tenants WHERE id = :orgId LIMIT 1`, {
    replacements: { orgId: screen.org_id },
    type: db.Sequelize.QueryTypes.SELECT,
  });

  if (!org || org.length === 0) return null;

  const tenant = org[0];

  // Find the first active playlist linked to this screen
  const screenPlaylist = await db.ScreenPlaylist.findOne({
    where: { screen_id: screen.id },
    order: [["sort_order", "ASC"]],
  });

  let playlistItems = [];

  if (screenPlaylist) {
    const playlist = await db.Playlist.findOne({
      where: { id: screenPlaylist.playlist_id, is_active: true },
      include: [
        {
          model: db.PlaylistItem,
          as: "items",
          include: [{ model: db.MediaAsset, as: "mediaAsset" }],
          order: [["sort_order", "ASC"]],
        },
      ],
    });

    if (playlist) {
      playlistItems = (playlist.items || []).map((item) => {
        const asset = item.mediaAsset;
        return {
          type: asset ? asset.mime_type : null,
          url: asset ? mediaService.getUrl(asset.storage_path) : null,
          duration_sec: item.duration_sec || asset?.duration_sec || null,
          width: asset?.width || null,
          height: asset?.height || null,
        };
      });
    }
  }

  return {
    screen: { name: screen.name },
    org: { name: tenant.name },
    playlist: { items: playlistItems },
  };
}

module.exports = { getScreenPlaylist };
/* service: displayService */
