const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_min_16_chars";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/testdb";

const app = require("../server");
const db = require("../models");

test("404 uses standard envelope and returns X-Request-Id", async () => {
  const res = await request(app).get("/api/does-not-exist");
  assert.equal(res.status, 404);
  assert.equal(res.body.ok, false);
  assert.equal(res.body.error.code, "NOT_FOUND");
  assert.ok(res.headers["x-request-id"]);
});

test.after(async () => {
  await db.sequelize.close().catch(() => {});
});
