const express = require("express");
const router = express.Router();
const { ok, fail } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const db = require("../models");
const mediaService = require("../services/mediaService");

/**
 * GET /display/:screenToken  —  Public display endpoint (NO AUTH).
 *
 * Looks up a screen by its token and returns the minimal data needed
 * for the live display client: screen name, org branding, and playlist items.
 */
router.get(
  "/:screenToken",
  asyncHandler(async (req, res) => {
    const { screenToken } = req.params;

    // Look up screen by token
    const screen = await db.Screen.findOne({
      where: { token: screenToken, is_active: true },
    });

    if (!screen) {
      return fail(res, 404, "NOT_FOUND", "Screen not found or inactive");
    }

    // Resolve org via raw query (tenants table is not a Sequelize model)
    const [orgRows] = await db.sequelize.query(
      `SELECT id, name, primary_color, logo_url FROM tenants WHERE id = :orgId LIMIT 1`,
      { replacements: { orgId: screen.org_id }, type: db.Sequelize.QueryTypes.SELECT }
    );
    const org = orgRows || null;

    if (!org) {
      return fail(res, 404, "NOT_FOUND", "Organization not found");
    }

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

    // Return ONLY branding-safe data — never expose auth tokens, employee data, or internal IDs
    return ok(res, {
      screen: {
        name: screen.name,
      },
      org: {
        name: org.name,
        primary_color: org.primary_color || null,
        logo_url: org.logo_url || null,
      },
      playlist: {
        items: playlistItems,
      },
    });
  })
);

module.exports = router;
/* route: displayRoutes */
