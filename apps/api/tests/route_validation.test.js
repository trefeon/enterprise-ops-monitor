const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_min_16_chars";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/testdb";

const app = require("../server");
const db = require("../models");

test("public agent version query validation returns standard envelope", async () => {
  const res = await request(app).get("/api/agent/version").query({ status: "bad" });

  assert.equal(res.status, 400);
  assert.equal(res.body.ok, false);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
  assert.equal(res.body.data, null);
});

test.after(async () => {
  await db.sequelize.close().catch(() => {});
});
