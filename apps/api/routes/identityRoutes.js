const express = require("express");
const router = express.Router();
const { z } = require("zod");
const identityController = require("../controllers/identityController");
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/rbac");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");

const querySchema = z
  .object({
    query: z.string().min(1),
  })
  .passthrough();

router.get(
  "/check",
  authMiddleware,
  requirePermission("NIK_LOOKUP"),
  validate({ query: querySchema }),
  asyncHandler(identityController.checkIdentity)
);

module.exports = router;
