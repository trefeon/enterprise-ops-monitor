const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const bcrypt = require("bcryptjs");

process.env.NODE_ENV = "test";
process.env.DATA_SYNC_TEST_MODE = "true";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_min_16_chars";
process.env.ADMIN_USERNAME = "admin";
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync("adminpass", 10);

const originalFetch = global.fetch;
const { BRANCHES } = require("../services/dataClient");
const db = require("../models");

global.fetch = async (_url, options) => {
  const payload = JSON.parse(options?.body || "{}");
  const branch = String(payload.branch || "0");
  const now = Date.now();
  const fresh = new Date(now - 2 * 60 * 1000).toUTCString();
  const stale = new Date(now - 20 * 60 * 1000).toUTCString();

  const data = [
    { kodetoko: Number(`${branch}01`), lastSync: fresh, namaToko: `Store ${branch}A` },
    { kodetoko: Number(`${branch}02`), lastSync: stale, namaToko: `Store ${branch}B` },
  ];

  return {
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
};

const app = require("../server");

async function getToken() {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ username: "admin", password: "adminpass" });

  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.ok(res.body.data.token);
  return res.body.data.token;
}

test("GET /api/sync/status returns summary", async () => {
  const token = await getToken();
  const res = await request(app).get("/api/sync/status").set("Authorization", `Bearer ${token}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.data.total, BRANCHES.length * 2);
  assert.equal(res.body.data.stale, 0);
  assert.equal(res.body.data.synced, BRANCHES.length);
  assert.equal(res.body.data.problem, BRANCHES.length);
  assert.equal(res.body.data.branches.length, BRANCHES.length);
});

test("GET /api/sync/summary returns race KPIs + meta", async () => {
  const token = await getToken();
  const res = await request(app).get("/api/sync/summary").set("Authorization", `Bearer ${token}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.data.totalStores, BRANCHES.length * 2);
  assert.equal(res.body.data.synced, BRANCHES.length);
  assert.equal(res.body.data.stale, 0);
  assert.equal(res.body.data.problem, BRANCHES.length);
  assert.equal(
    res.body.data.totalStores,
    res.body.data.synced + res.body.data.stale + res.body.data.problem
  );

  assert.ok(res.body.meta);
  assert.ok(res.body.meta.updatedAt);
  assert.equal(res.body.meta.snapshotAgeSec, 0);
});

test("GET /api/sync/stores returns paginated list", async () => {
  const token = await getToken();
  const res = await request(app)
    .get("/api/sync/stores?page=1&pageSize=5")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.data.length, 5);
  assert.equal(res.body.meta.pagination.total, BRANCHES.length * 2);
});

test("unauthorized requests return 401", async () => {
  const res = await request(app).get("/api/sync/status");
  assert.equal(res.status, 401);
  assert.equal(res.body.ok, false);
});

test.after(() => {
  if (originalFetch) {
    global.fetch = originalFetch;
  }
});

test.after(async () => {
  await db.sequelize.close().catch(() => {});
});
