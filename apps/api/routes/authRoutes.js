const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const { passwordSchema } = require("../utils/validators");

// Security: Strict rate limiter for login to prevent brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Relaxed for demo: 100 attempts per 15 minutes
  message: {
    ok: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many login attempts, please try again after 15 minutes",
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-Limit-Limit-*` headers
});

const loginBody = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const changePasswordBody = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

router.post(
  "/login",
  loginLimiter,
  validate({ body: loginBody }),
  asyncHandler(authController.login)
);
router.post("/logout", authMiddleware, asyncHandler(authController.logout));
router.get("/me", authMiddleware, asyncHandler(authController.me));
router.patch(
  "/me/password",
  authMiddleware,
  validate({ body: changePasswordBody }),
  asyncHandler(authController.changePassword)
);

module.exports = router;
