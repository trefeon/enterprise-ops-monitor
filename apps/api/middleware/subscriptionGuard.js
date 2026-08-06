"use strict";

const { fail } = require("../utils/response");
const db = require("../models");

const DISPLAY_PATHS = ["/display"];

/**
 * Middleware that checks if the requesting org's subscription is active.
 * If trial has expired or subscription is cancelled, returns 402 Payment Required.
 * Does NOT block /display/* endpoints.
 */
module.exports = async function subscriptionGuard(req, res, next) {
  // Skip guard for display endpoints
  if (DISPLAY_PATHS.some((p) => (req.path || "").startsWith(p))) {
    return next();
  }

  // Identify the org from trusted request context only: the :orgId URL param
  // (org-scoped paths), the tenant resolved by tenantMiddleware, or the JWT
  // (req.user.orgId / req.authz). Query/body-supplied orgIds are
  // attacker-controlled and MUST NOT be used to pick which subscription to
  // check (guard bypass).
  const orgId = req.params?.orgId || req.tenantId || req.user?.orgId || req.authz?.orgId;

  if (!orgId) {
    // No org context — let it pass (some routes don't need it)
    return next();
  }

  try {
    const [subscription] = await db.sequelize.query(
      `SELECT * FROM subscriptions WHERE org_id = :orgId ORDER BY created_at DESC LIMIT 1`,
      {
        replacements: { orgId },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );

    // No subscription found: this is a new org, allow trial creation
    if (!subscription) {
      return next();
    }

    const status = subscription.status;

    // Active subscription — pass through
    if (status === "active") {
      return next();
    }

    // Trial — check if still within trial period
    if (status === "trial") {
      const trialEnd = new Date(subscription.billing_period_end || subscription.created_at);
      const trialEndMs = trialEnd.getTime() + 14 * 24 * 60 * 60 * 1000;

      if (Date.now() <= trialEndMs) {
        return next();
      }

      // Trial expired
      return fail(
        res,
        402,
        "PAYMENT_REQUIRED",
        "Trial period has expired. Please subscribe to continue.",
        {
          subscriptionId: subscription.id,
          status: "trial_expired",
        }
      );
    }

    // Cancelled or past_due
    if (status === "cancelled" || status === "past_due") {
      return fail(
        res,
        402,
        "PAYMENT_REQUIRED",
        "Subscription is inactive. Please renew to continue.",
        {
          subscriptionId: subscription.id,
          status,
        }
      );
    }

    return next();
  } catch (err) {
    console.error("Subscription guard error:", err);
    return next();
  }
};
