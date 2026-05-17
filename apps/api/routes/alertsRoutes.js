const express = require("express");
const router = express.Router();
const alertsController = require("../controllers/alertsController");
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/rbac");
const asyncHandler = require("../utils/asyncHandler");

router.get(
  "/eod",
  authMiddleware,
  requirePermission("EOD_VIEW"),
  asyncHandler(alertsController.getEodAlerts)
);

module.exports = router;
