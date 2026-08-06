"use strict";

const { ok, fail } = require("../utils/response");
const { createBillingProvider, PLANS } = require("../services/billingService");

const billingProvider = createBillingProvider();

// ── Helpers ─────────────────────────────────────────────────

/**
 * Resolve the current organization ID from request context.
 * Priority: req.params.orgId → req.tenantId → req.authz (not set by current middleware)
 */
function resolveOrgId(req) {
  return req.params?.orgId || req.tenantId || null;
}

// ── Handlers ────────────────────────────────────────────────

/**
 * GET /
 * Get subscription for current org, creating a default 'trial' if none exists.
 */
exports.getSubscription = async (req, res) => {
  const orgId = resolveOrgId(req);
  if (!orgId) {
    return fail(res, 400, "MISSING_ORG", "Organization ID is required");
  }

  let result = await billingProvider.getSubscriptionStatus(orgId);

  // Auto-create trial subscription if none exists
  if (!result) {
    result = await billingProvider.createSubscription(orgId, "starter", {
      branchCount: 0,
      screenCount: 0,
    });
  }

  return ok(res, {
    subscription: result.subscription || null,
    invoices: result.invoices || [],
    plans: PLANS,
  });
};

/**
 * POST /subscription
 * Create or update subscription plan.
 * Body: { plan?, branchCount?, screenCount? }
 */
exports.updateSubscription = async (req, res) => {
  const orgId = resolveOrgId(req);
  if (!orgId) {
    return fail(res, 400, "MISSING_ORG", "Organization ID is required");
  }

  const { plan, branchCount, screenCount } = req.body;

  // Ensure subscription exists first
  let existing = await billingProvider.getSubscriptionStatus(orgId);
  if (!existing) {
    // Create default trial first with the requested values
    existing = await billingProvider.createSubscription(orgId, plan || "starter", {
      branchCount: branchCount ?? 0,
      screenCount: screenCount ?? 0,
    });

    return ok(res, {
      subscription: existing.subscription || existing,
      message: "Subscription created",
      plans: PLANS,
    });
  }

  // Update existing subscription
  await billingProvider.updateSubscription(orgId, {
    plan,
    branchCount,
    screenCount,
  });

  // Determine what changed for invoice generation
  const currentPlan = plan || existing.subscription.plan;
  const currentBranchCount = branchCount ?? existing.subscription.branch_count;
  const currentScreenCount = screenCount ?? existing.subscription.screen_count;

  // Calculate new amount
  const amount = billingProvider.calculateAmount(
    currentPlan,
    currentBranchCount,
    currentScreenCount
  );

  // Create invoice on plan change (when plan or counts change)
  const planChanged =
    (plan && plan !== existing.subscription.plan) ||
    (branchCount !== undefined && branchCount !== existing.subscription.branch_count) ||
    (screenCount !== undefined && screenCount !== existing.subscription.screen_count);

  let invoice = null;
  if (planChanged) {
    invoice = await billingProvider.generateInvoice(orgId, { amount });
  }

  // Re-fetch refreshed subscription
  const refreshed = await billingProvider.getSubscriptionStatus(orgId);

  return ok(res, {
    subscription: refreshed?.subscription || null,
    invoice: invoice || null,
    amount,
    message: planChanged ? "Plan updated — new invoice created" : "Subscription updated",
    plans: PLANS,
  });
};

/**
 * GET /invoices
 * List invoices for current org.
 */
exports.listInvoices = async (req, res) => {
  const orgId = resolveOrgId(req);
  if (!orgId) {
    return fail(res, 400, "MISSING_ORG", "Organization ID is required");
  }

  const result = await billingProvider.getSubscriptionStatus(orgId);
  if (!result) {
    return ok(res, { invoices: [] });
  }

  return ok(res, { invoices: result.invoices || [] });
};

/**
 * GET /invoices/:id
 * Get invoice detail by ID.
 */
exports.getInvoice = async (req, res) => {
  const orgId = resolveOrgId(req);
  if (!orgId) {
    return fail(res, 400, "MISSING_ORG", "Organization ID is required");
  }

  const { id } = req.params;

  const result = await billingProvider.getSubscriptionStatus(orgId);
  if (!result) {
    return fail(res, 404, "INVOICE_NOT_FOUND", "Invoice not found");
  }

  const invoice = (result.invoices || []).find((inv) => inv.id === id);
  if (!invoice) {
    return fail(res, 404, "INVOICE_NOT_FOUND", "Invoice not found");
  }

  return ok(res, {
    invoice,
    subscription: result.subscription,
  });
};
