const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { ok, fail } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/rbac");
const validate = require("../middleware/validate");
const db = require("../models");

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const uuidParam = z.object({ id: z.string().uuid("Invalid UUID") });
const orgIdParam = z.object({ orgId: z.string().uuid("Invalid org ID") });

const createScreenBody = z.object({
  name: z.string().min(1).max(255),
  branch_id: z.number().int().optional(),
  logo_url: z.string().url().optional().nullable(),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be hex color").optional().nullable(),
});

const updateScreenBody = z.object({
  name: z.string().min(1).max(255).optional(),
  is_active: z.boolean().optional(),
  logo_url: z.string().url().optional().nullable(),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
});

const createPlaylistBody = z.object({
  name: z.string().min(1).max(255),
  branch_id: z.number().int(),
  daypart_config: z.record(z.any()).optional(),
});

const updatePlaylistBody = z.object({
  name: z.string().min(1).max(255).optional(),
  is_active: z.boolean().optional(),
  daypart_config: z.record(z.any()).optional(),
});

const addItemBody = z.object({
  media_asset_id: z.string().uuid(),
  sort_order: z.number().int().min(0),
  duration_sec: z.number().int().positive().optional(),
});

const reorderBody = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sort_order: z.number().int().min(0),
    })
  ),
});

// ---------------------------------------------------------------------------
// SCREENS
// ---------------------------------------------------------------------------

// GET  /api/orgs/:orgId/screens
router.get(
  "/screens",
  authMiddleware,
  requirePermission("SCREENS_VIEW"),
  validate({ params: orgIdParam }),
  asyncHandler(async (req, res) => {
    const screens = await db.Screen.findAll({
      where: { org_id: req.params.orgId },
      order: [["name", "ASC"]],
    });
    return ok(res, { screens });
  })
);

// GET  /api/orgs/:orgId/screens/:id
router.get(
  "/screens/:id",
  authMiddleware,
  requirePermission("SCREENS_VIEW"),
  validate({ params: orgIdParam.partial().extend({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const screen = await db.Screen.findByPk(req.params.id);
    if (!screen) return fail(res, 404, "NOT_FOUND", "Screen not found");
    return ok(res, { screen });
  })
);

// POST /api/orgs/:orgId/screens
router.post(
  "/screens",
  authMiddleware,
  requirePermission("SCREENS_EDIT"),
  validate({ params: orgIdParam, body: createScreenBody }),
  asyncHandler(async (req, res) => {
    const screen = await db.Screen.create({
      org_id: req.params.orgId,
      branch_id: req.body.branch_id || null,
      name: req.body.name,
      logo_url: req.body.logo_url || null,
      primary_color: req.body.primary_color || null,
    });
    return ok(res, { screen }, null, 201);
  })
);

// PUT  /api/orgs/:orgId/screens/:id
router.put(
  "/screens/:id",
  authMiddleware,
  requirePermission("SCREENS_EDIT"),
  validate({
    params: orgIdParam.partial().extend({ id: z.string().uuid() }),
    body: updateScreenBody,
  }),
  asyncHandler(async (req, res) => {
    const screen = await db.Screen.findByPk(req.params.id);
    if (!screen) return fail(res, 404, "NOT_FOUND", "Screen not found");

    const allowed = ["name", "is_active", "logo_url", "primary_color"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        screen[key] = req.body[key];
      }
    }
    await screen.save();
    return ok(res, { screen });
  })
);

// DELETE  /api/orgs/:orgId/screens/:id
router.delete(
  "/screens/:id",
  authMiddleware,
  requirePermission("SCREENS_EDIT"),
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    const screen = await db.Screen.findByPk(req.params.id);
    if (!screen) return fail(res, 404, "NOT_FOUND", "Screen not found");
    await screen.destroy();
    return ok(res, { deleted: true });
  })
);

// POST  /api/orgs/:orgId/screens/:id/regenerate-token
router.post(
  "/screens/:id/regenerate-token",
  authMiddleware,
  requirePermission("SCREENS_EDIT"),
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    const screen = await db.Screen.findByPk(req.params.id);
    if (!screen) return fail(res, 404, "NOT_FOUND", "Screen not found");

    screen.token = db.Screen.generateToken();
    await screen.save();
    return ok(res, { screen });
  })
);

// GET  /api/orgs/:orgId/screens/:id/qr
// Returns a pairing URL that a display client can encode as QR code.
router.get(
  "/screens/:id/qr",
  authMiddleware,
  requirePermission("SCREENS_VIEW"),
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    const screen = await db.Screen.findByPk(req.params.id);
    if (!screen) return fail(res, 404, "NOT_FOUND", "Screen not found");

    const pairingUrl = `${req.protocol}://${req.get("host")}/display/${screen.token}`;
    return ok(res, { pairing_url: pairingUrl, token: screen.token });
  })
);

// ---------------------------------------------------------------------------
// PLAYLISTS
// ---------------------------------------------------------------------------

// GET  /api/orgs/:orgId/playlists
router.get(
  "/playlists",
  authMiddleware,
  requirePermission("PLAYLISTS_VIEW"),
  validate({ params: orgIdParam }),
  asyncHandler(async (req, res) => {
    const playlists = await db.Playlist.findAll({
      where: { org_id: req.params.orgId },
      include: [{ model: db.PlaylistItem, as: "items", include: [{ model: db.MediaAsset, as: "mediaAsset" }] }],
      order: [["name", "ASC"]],
    });
    return ok(res, { playlists });
  })
);

// GET  /api/orgs/:orgId/playlists/:id
router.get(
  "/playlists/:id",
  authMiddleware,
  requirePermission("PLAYLISTS_VIEW"),
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    const playlist = await db.Playlist.findByPk(req.params.id, {
      include: [{ model: db.PlaylistItem, as: "items", include: [{ model: db.MediaAsset, as: "mediaAsset" }] }],
    });
    if (!playlist) return fail(res, 404, "NOT_FOUND", "Playlist not found");
    return ok(res, { playlist });
  })
);

// POST  /api/orgs/:orgId/playlists
router.post(
  "/playlists",
  authMiddleware,
  requirePermission("PLAYLISTS_EDIT"),
  validate({ params: orgIdParam, body: createPlaylistBody }),
  asyncHandler(async (req, res) => {
    const playlist = await db.Playlist.create({
      org_id: req.params.orgId,
      branch_id: req.body.branch_id,
      name: req.body.name,
      daypart_config: req.body.daypart_config || {},
    });
    return ok(res, { playlist }, null, 201);
  })
);

// PUT  /api/orgs/:orgId/playlists/:id
router.put(
  "/playlists/:id",
  authMiddleware,
  requirePermission("PLAYLISTS_EDIT"),
  validate({ params: uuidParam, body: updatePlaylistBody }),
  asyncHandler(async (req, res) => {
    const playlist = await db.Playlist.findByPk(req.params.id);
    if (!playlist) return fail(res, 404, "NOT_FOUND", "Playlist not found");

    const allowed = ["name", "is_active", "daypart_config"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        playlist[key] = req.body[key];
      }
    }
    await playlist.save();
    return ok(res, { playlist });
  })
);

// DELETE  /api/orgs/:orgId/playlists/:id
router.delete(
  "/playlists/:id",
  authMiddleware,
  requirePermission("PLAYLISTS_EDIT"),
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    const playlist = await db.Playlist.findByPk(req.params.id);
    if (!playlist) return fail(res, 404, "NOT_FOUND", "Playlist not found");
    await playlist.destroy();
    return ok(res, { deleted: true });
  })
);

// POST  /api/orgs/:orgId/playlists/:id/items
router.post(
  "/playlists/:id/items",
  authMiddleware,
  requirePermission("PLAYLISTS_EDIT"),
  validate({ params: uuidParam, body: addItemBody }),
  asyncHandler(async (req, res) => {
    const playlist = await db.Playlist.findByPk(req.params.id);
    if (!playlist) return fail(res, 404, "NOT_FOUND", "Playlist not found");

    const item = await db.PlaylistItem.create({
      playlist_id: req.params.id,
      media_asset_id: req.body.media_asset_id,
      sort_order: req.body.sort_order,
      duration_sec: req.body.duration_sec || null,
    });

    return ok(res, { item }, null, 201);
  })
);

// DELETE  /api/orgs/:orgId/playlists/:id/items/:itemId
router.delete(
  "/playlists/:id/items/:itemId",
  authMiddleware,
  requirePermission("PLAYLISTS_EDIT"),
  validate({ params: z.object({ id: z.string().uuid(), itemId: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const item = await db.PlaylistItem.findOne({
      where: { id: req.params.itemId, playlist_id: req.params.id },
    });
    if (!item) return fail(res, 404, "NOT_FOUND", "Playlist item not found");
    await item.destroy();
    return ok(res, { deleted: true });
  })
);

// POST  /api/orgs/:orgId/playlists/reorder  —  batch update sort_order
router.post(
  "/playlists/reorder",
  authMiddleware,
  requirePermission("PLAYLISTS_EDIT"),
  validate({ params: orgIdParam, body: reorderBody }),
  asyncHandler(async (req, res) => {
    const { items } = req.body;
    for (const { id, sort_order } of items) {
      await db.PlaylistItem.update({ sort_order }, { where: { id } });
    }
    return ok(res, { updated: true });
  })
);

module.exports = router;
/* route: screenRoutes */
