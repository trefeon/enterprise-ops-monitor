"use strict";

const express = require("express");
const router = express.Router();
const { z } = require("zod");
const billingController = require("../controllers/billingController");
const authMiddleware = require("../middleware/authMiddleware");
const subscriptionGuard = require("../middleware/subscriptionGuard");
const { requirePermission } = require("../middleware/rbac");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");

// ── Validation schemas ──────────────────────────────────────

const emptyQuery = z.object({}).passthrough();

const subscriptionUpdateBody = z
  .object({
    plan: z.enum(["starter", "growth", "scale"]).optional(),
    branchCount: z.number().int().min(0).optional(),
    screenCount: z.number().int().min(0).optional(),
    /** Alias for screenCount */
    screenAddOns: z.number().int().min(0).optional(),
  })
  .passthrough();

const invoiceIdParams = z
  .object({
    id: z.string().uuid("Invoice ID must be a valid UUID"),
  })
  .passthrough();

// ── Routes ──────────────────────────────────────────────────

/**
 * GET /
 * Get subscription for current org (auto-creates trial if none exists).
 * NOT gated by subscriptionGuard: it is the status read that the billing UI
 * (paywall/renewal state) depends on — an expired org must still be able to
 * see WHY it is blocked.
 */
router.get(
  "/",
  authMiddleware,
  requirePermission("BILLING_VIEW"),
  validate({ query: emptyQuery }),
  asyncHandler(billingController.getSubscription)
);

/**
 * POST /subscription
 * Create or update subscription plan.
 * Body: { plan?, branchCount?, screenCount?, screenAddOns? }
 * Gated: inactive/expired subscriptions cannot change plans.
 */
router.post(
  "/subscription",
  authMiddleware,
  requirePermission("BILLING_VIEW"),
  subscriptionGuard,
  validate({ body: subscriptionUpdateBody }),
  asyncHandler(billingController.updateSubscription)
);

/**
 * GET /invoices
 * List invoices for the current org.
 * Gated: inactive/expired subscriptions cannot read invoices.
 */
router.get(
  "/invoices",
  authMiddleware,
  requirePermission("BILLING_VIEW"),
  subscriptionGuard,
  validate({ query: emptyQuery }),
  asyncHandler(billingController.listInvoices)
);

/**
 * GET /invoices/:id
 * Get a single invoice by ID.
 * Gated: same policy as the invoice list.
 */
router.get(
  "/invoices/:id",
  authMiddleware,
  requirePermission("BILLING_VIEW"),
  subscriptionGuard,
  validate({ params: invoiceIdParams }),
  asyncHandler(billingController.getInvoice)
);

module.exports = router;
