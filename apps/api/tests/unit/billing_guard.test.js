const { describe, it, beforeEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const express = require("express");
const request = require("supertest");

process.env.NODE_ENV = "test";

const baseDir = path.resolve(__dirname, "../../");
const abs = (rel) => path.join(baseDir, rel);

// ── MOCKING INFRASTRUCTURE ────────────────────────────────────────────────
// The subscription guard queries the subscriptions table via db.sequelize,
// so models/index.js is mocked. The billing router's authMiddleware and rbac
// are mocked to pass through (their behavior is covered elsewhere); the
// billing controller is mocked to prove the guard placement, not the
// controller logic.

let subscriptionRows = [];

const mockModels = {
  sequelize: {
    query: mock.fn(async () => subscriptionRows),
  },
  Sequelize: {
    QueryTypes: { SELECT: "SELECT" },
  },
};

const mockAuthMiddleware = async (req, _res, next) => {
  req.user = { id: "u-1", username: "alice", role: "org_admin", orgId: "o-1" };
  req.authz = {
    roleNames: ["org_admin"],
    effectivePerms: ["BILLING_VIEW"],
    scopeBranches: [],
    isAllBranches: true,
  };
  next();
};

const mockRbac = {
  requirePermission: () => (_req, _res, next) => next(),
};

const mockBillingController = {
  getSubscription: async (_req, res) => {
    res.status(200).json({ ok: true, data: { subscription: { status: "trial" } }, error: null });
  },
  updateSubscription: async (_req, res) => {
    res.status(200).json({ ok: true, data: { updated: true }, error: null });
  },
  listInvoices: async (_req, res) => {
    res.status(200).json({ ok: true, data: { invoices: [] }, error: null });
  },
  getInvoice: async (_req, res) => {
    res.status(200).json({ ok: true, data: { invoice: { id: "inv-1" } }, error: null });
  },
};

function installMocks() {
  const entries = {
    "models/index.js": mockModels,
    "middleware/authMiddleware.js": mockAuthMiddleware,
    "middleware/rbac.js": mockRbac,
    "controllers/billingController.js": mockBillingController,
  };
  for (const [rel, exportsVal] of Object.entries(entries)) {
    const absPath = abs(rel);
    require.cache[absPath] = { id: absPath, filename: absPath, loaded: true, exports: exportsVal };
  }
}

installMocks();

const subscriptionGuard = require("../../middleware/subscriptionGuard");

const ORG_ID = "11111111-1111-4111-8111-111111111111";
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

function makeRes() {
  const res = { statusCode: null, body: null, headersSent: false };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    res.headersSent = true;
    return res;
  };
  return res;
}

function guardCall(req) {
  const res = makeRes();
  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };
  return subscriptionGuard(req, res, next).then(() => ({ res, nextCalled }));
}

function subscriptionRow(overrides = {}) {
  return {
    id: "sub-1",
    org_id: ORG_ID,
    status: "active",
    plan: "starter",
    billing_period_start: daysAgo(10),
    billing_period_end: daysAgo(10 + 30),
    created_at: daysAgo(10),
    ...overrides,
  };
}

// ── Direct guard unit tests (status matrix) ───────────────────────────────

describe("subscriptionGuard status matrix", () => {
  beforeEach(() => {
    subscriptionRows = [];
  });

  it("passes an active subscription", async () => {
    subscriptionRows = [subscriptionRow({ status: "active" })];
    const { res, nextCalled } = await guardCall({ params: { orgId: ORG_ID } });
    assert.equal(nextCalled, true);
    assert.equal(res.headersSent, false, "guard must not write a response");
  });

  it("passes a trial still inside the 14-day window", async () => {
    // Realistic trial: billing_period_end is the end of the current month
    // (billingService.createSubscription) → still inside the guard window.
    subscriptionRows = [
      subscriptionRow({ status: "trial", created_at: daysAgo(3), billing_period_end: daysAgo(-5) }),
    ];
    const { res, nextCalled } = await guardCall({ params: { orgId: ORG_ID } });
    assert.equal(nextCalled, true);
    assert.equal(res.headersSent, false);
  });

  it("blocks an expired trial with 402 PAYMENT_REQUIRED", async () => {
    subscriptionRows = [subscriptionRow({ status: "trial", created_at: daysAgo(40) })];
    const { res, nextCalled } = await guardCall({ params: { orgId: ORG_ID } });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 402);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.error.code, "PAYMENT_REQUIRED");
  });

  it("blocks cancelled and past_due subscriptions with 402", async () => {
    for (const status of ["cancelled", "past_due"]) {
      subscriptionRows = [subscriptionRow({ status })];
      const { res, nextCalled } = await guardCall({ params: { orgId: ORG_ID } });
      assert.equal(nextCalled, false, `${status} must be blocked`);
      assert.equal(res.statusCode, 402);
      assert.equal(res.body.error.code, "PAYMENT_REQUIRED");
    }
  });

  it("passes when no subscription exists (new org, trial creation allowed)", async () => {
    subscriptionRows = [];
    const { nextCalled } = await guardCall({ params: { orgId: ORG_ID } });
    assert.equal(nextCalled, true);
  });

  it("resolves the org from req.tenantId (legacy /api/billing paths)", async () => {
    subscriptionRows = [subscriptionRow({ status: "cancelled" })];
    // No :orgId param — tenantMiddleware-resolved tenant is the only signal.
    const { res, nextCalled } = await guardCall({ tenantId: ORG_ID });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 402, "legacy path must still be gated via tenantId");
  });

  it("ignores attacker-controlled body/query orgId when no trusted context exists", async () => {
    subscriptionRows = [subscriptionRow({ status: "cancelled" })];
    // Attacker supplies a body orgId, but there is no params/tenantId/authz
    // context → the guard must NOT use it (it passes instead of checking a
    // subscription the attacker does not belong to).
    const { res, nextCalled } = await guardCall({
      body: { orgId: ORG_ID },
      query: { orgId: ORG_ID },
    });
    assert.equal(nextCalled, true, "untrusted orgIds must not be used for the gate");
    assert.equal(res.headersSent, false);
  });
});

// ── Wiring test: guard is live on gated billing endpoints ────────────────

describe("billingRoutes — subscriptionGuard wiring", () => {
  let app;

  beforeEach(() => {
    delete require.cache[require.resolve("../../routes/billingRoutes")];
    const billingRoutes = require("../../routes/billingRoutes");
    app = express();
    app.use(express.json());
    app.use("/api/billing", billingRoutes);
    subscriptionRows = [];
  });

  it("GET /api/billing/invoices returns 402 for an expired trial org", async () => {
    subscriptionRows = [subscriptionRow({ status: "trial", created_at: daysAgo(40) })];
    const res = await request(app).get("/api/billing/invoices");
    assert.equal(res.status, 402);
    assert.equal(res.body.error.code, "PAYMENT_REQUIRED");
  });

  it("GET /api/billing/invoices passes through for an active org", async () => {
    subscriptionRows = [subscriptionRow({ status: "active" })];
    const res = await request(app).get("/api/billing/invoices");
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
  });

  it("POST /api/billing/subscription is gated", async () => {
    subscriptionRows = [subscriptionRow({ status: "cancelled" })];
    const res = await request(app).post("/api/billing/subscription").send({ plan: "growth" });
    assert.equal(res.status, 402);
  });

  it("GET /api/billing (status read) stays reachable for an expired org", async () => {
    subscriptionRows = [subscriptionRow({ status: "trial", created_at: daysAgo(40) })];
    const res = await request(app).get("/api/billing");
    assert.equal(res.status, 200, "paywall/status read must not be gated");
    assert.equal(res.body.ok, true);
  });
});
