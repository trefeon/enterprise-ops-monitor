const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const passport = require("passport");
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

const registerBody = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  orgName: z.string().max(255).optional(),
});

const inviteBody = z.object({
  email: z.string().email("Invalid email address"),
  roleName: z.string().min(1, "Role name is required"),
});

const acceptInviteBody = z.object({
  token: z.string().min(1, "Invite token is required"),
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: passwordSchema,
});

const changePasswordBody = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});
const emptyQuery = z.object({}).passthrough();
const emptyBody = z.object({}).passthrough().optional().default({});

router.post(
  "/login",
  loginLimiter,
  validate({ body: loginBody }),
  asyncHandler(authController.login)
);
router.post(
  "/register",
  validate({ body: registerBody }),
  asyncHandler(authController.register)
);
router.post(
  "/invite",
  authMiddleware,
  validate({ body: inviteBody }),
  asyncHandler(authController.invite)
);
router.post(
  "/accept-invite",
  validate({ body: acceptInviteBody }),
  asyncHandler(authController.acceptInvite)
);
router.post(
  "/refresh",
  authMiddleware,
  validate({ body: emptyBody }),
  asyncHandler(authController.refresh)
);
router.post(
  "/logout",
  authMiddleware,
  validate({ body: emptyBody }),
  asyncHandler(authController.logout)
);
router.get("/me", authMiddleware, validate({ query: emptyQuery }), asyncHandler(authController.me));
router.patch(
  "/me/password",
  authMiddleware,
  validate({ body: changePasswordBody }),
  asyncHandler(authController.changePassword)
);
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login?error=google_auth_failed" }),
  asyncHandler(authController.googleCallback)
);

module.exports = router;
