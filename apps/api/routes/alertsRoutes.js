const express = require("express");
const router = express.Router();
const { z } = require("zod");
const alertsController = require("../controllers/alertsController");
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/rbac");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");

const alertsQuery = z.object({}).passthrough();

router.get(
  "/eod",
  authMiddleware,
  requirePermission("EOD_VIEW"),
  validate({ query: alertsQuery }),
  asyncHandler(alertsController.getEodAlerts)
);

module.exports = router;
