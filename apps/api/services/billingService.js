"use strict";

const db = require("../models");

// ── Pricing plan defaults (IDR) ────────────────────────────

const PLANS = {
  starter: {
    label: "Starter",
    monthlyPerBranch: 49000,
    screenAddonPerScreen: 30000,
    freeScreensPerOrg: 1,
  },
  growth: {
    label: "Growth",
    monthlyPerBranch: 79000,
    screenAddonPerScreen: 30000,
    freeScreensPerOrg: 1,
  },
  scale: {
    label: "Scale",
    monthlyPerBranch: 69000,
    screenAddonPerScreen: 30000,
    freeScreensPerOrg: 1,
  },
};

const TRIAL_DAYS = 14;

// ── Helpers ───────────────────────────────────────────────

function generateInvoiceNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${ts}-${rand}`;
}

function generateQrisLink(invoiceNumber, amount) {
  // v1: placeholder QRIS image URL. In production this would call a QRIS provider API.
  return `https://qr.example.com/qris/${invoiceNumber}?amount=${amount}`;
}

// ── ManualBillingProvider ──────────────────────────────────

class ManualBillingProvider {
  /**
   * Create a subscription + initial invoice for an org.
   * Returns { status, invoiceUrl }.
   */
  async createSubscription(orgId, plan = "starter", options = {}) {
    const { branchCount = 0, screenCount = 0 } = options;

    // Validate plan
    const planConfig = PLANS[plan];
    if (!planConfig) {
      const err = new Error(`Unknown plan: ${plan}`);
      err.status = 400;
      throw err;
    }

    // Calculate billing period (monthly)
    const now = new Date();
    const billingStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const billingEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));

    // Create subscription record
    const subResult = await db.sequelize.query(
      `INSERT INTO subscriptions (org_id, status, plan, branch_count, screen_count, billing_period_start, billing_period_end, provider)
       VALUES (:orgId, 'trial', :plan, :branchCount, :screenCount, :billingStart, :billingEnd, 'manual')
       RETURNING *`,
      {
        replacements: {
          orgId,
          plan,
          branchCount,
          screenCount,
          billingStart: billingStart.toISOString().split("T")[0],
          billingEnd: billingEnd.toISOString().split("T")[0],
        },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );

    const subscription = subResult[0];

    // Create initial invoice
    const amount = this.calculateAmount(plan, branchCount, screenCount);
    const invoiceNumber = generateInvoiceNumber();
    const dueAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    await db.sequelize.query(
      `INSERT INTO billing_invoices (subscription_id, amount, status, due_at, invoice_number, payment_method)
       VALUES (:subscriptionId, :amount, 'pending', :dueAt, :invoiceNumber, 'qris_manual')`,
      {
        replacements: {
          subscriptionId: subscription.id,
          amount,
          dueAt,
          invoiceNumber,
        },
      }
    );

    const invoiceUrl = generateQrisLink(invoiceNumber, amount);

    return {
      status: "trial",
      invoiceUrl,
      invoiceNumber,
      amount,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        branchCount: subscription.branch_count,
        screenCount: subscription.screen_count,
        billingPeriodStart: subscription.billing_period_start,
        billingPeriodEnd: subscription.billing_period_end,
      },
    };
  }

  /**
   * Cancel a subscription.
   */
  async cancelSubscription(id) {
    const [sub] = await db.sequelize.query(
      `UPDATE subscriptions SET status = 'cancelled', updated_at = NOW()
       WHERE id = :id RETURNING *`,
      {
        replacements: { id },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );

    if (!sub) {
      const err = new Error("Subscription not found");
      err.status = 404;
      throw err;
    }

    return { id: sub.id, status: "cancelled" };
  }

  /**
   * Get subscription status + recent invoices.
   */
  async getSubscriptionStatus(orgId) {
    const subscription = await db.sequelize.query(
      `SELECT * FROM subscriptions WHERE org_id = :orgId ORDER BY created_at DESC LIMIT 1`,
      {
        replacements: { orgId },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );

    if (!subscription || subscription.length === 0) {
      return null;
    }

    const sub = subscription[0];
    const invoices = await db.sequelize.query(
      `SELECT * FROM billing_invoices WHERE subscription_id = :subId ORDER BY created_at DESC`,
      {
        replacements: { subId: sub.id },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );

    return {
      subscription: sub,
      invoices,
    };
  }

  /**
   * Handle manual payment confirmation (webhook equivalent).
   * The admin calls this to mark an invoice as paid.
   */
  async handleWebhook(req) {
    const { subscriptionId, invoiceId } = req.body || {};

    if (invoiceId) {
      const [invoice] = await db.sequelize.query(
        `UPDATE billing_invoices
         SET status = 'paid', paid_at = NOW()
         WHERE id = :invoiceId AND status = 'pending'
         RETURNING *`,
        {
          replacements: { invoiceId },
          type: db.Sequelize.QueryTypes.SELECT,
        }
      );

      if (invoice) {
        // Activate subscription if it was trial
        await db.sequelize.query(
          `UPDATE subscriptions SET status = 'active', updated_at = NOW()
           WHERE id = :subId AND status = 'trial'`,
          {
            replacements: { subId: invoice.subscription_id },
          }
        );
      }

      return { invoice, activated: !!invoice };
    }

    if (subscriptionId) {
      const [sub] = await db.sequelize.query(
        `UPDATE subscriptions SET status = 'active', updated_at = NOW()
         WHERE id = :subscriptionId AND status IN ('trial', 'past_due')
         RETURNING *`,
        {
          replacements: { subscriptionId },
          type: db.Sequelize.QueryTypes.SELECT,
        }
      );
      return { subscription: sub, activated: !!sub };
    }

    return { received: true };
  }

  /**
   * Update subscription plan/branch count/screen count.
   */
  async updateSubscription(orgId, updates) {
    const { plan, branchCount, screenCount } = updates;

    const existing = await db.sequelize.query(
      `SELECT * FROM subscriptions WHERE org_id = :orgId ORDER BY created_at DESC LIMIT 1`,
      {
        replacements: { orgId },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );

    if (!existing || existing.length === 0) {
      const err = new Error("No subscription found for this org");
      err.status = 404;
      throw err;
    }

    const sub = existing[0];
    const setClauses = [];
    const params = { id: sub.id };

    if (plan) {
      setClauses.push("plan = :plan");
      params.plan = plan;
    }
    if (branchCount !== undefined) {
      setClauses.push("branch_count = :branchCount");
      params.branchCount = branchCount;
    }
    if (screenCount !== undefined) {
      setClauses.push("screen_count = :screenCount");
      params.screenCount = screenCount;
    }

    if (setClauses.length > 0) {
      setClauses.push("updated_at = NOW()");
      await db.sequelize.query(`UPDATE subscriptions SET ${setClauses.join(", ")} WHERE id = :id`, {
        replacements: params,
      });
    }

    return { updated: true };
  }

  /**
   * Generate a new QRIS invoice for the org.
   */
  async generateInvoice(orgId, options = {}) {
    const { amount } = options;

    const existing = await db.sequelize.query(
      `SELECT * FROM subscriptions WHERE org_id = :orgId ORDER BY created_at DESC LIMIT 1`,
      {
        replacements: { orgId },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );

    if (!existing || existing.length === 0) {
      const err = new Error("No subscription found for this org");
      err.status = 404;
      throw err;
    }

    const sub = existing[0];
    const finalAmount =
      amount || this.calculateAmount(sub.plan, sub.branch_count, sub.screen_count);

    const invoiceNumber = generateInvoiceNumber();
    const dueAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [invoice] = await db.sequelize.query(
      `INSERT INTO billing_invoices (subscription_id, amount, status, due_at, invoice_number, payment_method)
       VALUES (:subscriptionId, :amount, 'pending', :dueAt, :invoiceNumber, 'qris_manual')
       RETURNING *`,
      {
        replacements: {
          subscriptionId: sub.id,
          amount: finalAmount,
          dueAt,
          invoiceNumber,
        },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );

    const invoiceUrl = generateQrisLink(invoiceNumber, finalAmount);

    return {
      invoice: invoice[0] || invoice,
      invoiceUrl,
      invoiceNumber,
      amount: finalAmount,
    };
  }

  /**
   * Calculate monthly amount based on plan, branch count, and screen add-on.
   */
  calculateAmount(plan, branchCount = 0, screenCount = 0) {
    const planConfig = PLANS[plan];
    if (!planConfig) return 0;

    const branchAmount = planConfig.monthlyPerBranch * branchCount;
    const billableScreens = Math.max(0, screenCount - (planConfig.freeScreensPerOrg || 0));
    const screenAmount = planConfig.screenAddonPerScreen * billableScreens;

    return branchAmount + screenAmount;
  }
}

// ── Factory ────────────────────────────────────────────────

/**
 * Factory that returns the current billing provider.
 * For v1, returns ManualBillingProvider.
 * Future: swap to MidtransProvider / XenditProvider.
 */
function createBillingProvider() {
  return new ManualBillingProvider();
}

module.exports = {
  ManualBillingProvider,
  createBillingProvider,
  PLANS,
  TRIAL_DAYS,
};
