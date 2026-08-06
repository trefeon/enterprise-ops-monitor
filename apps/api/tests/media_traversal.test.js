const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_min_16_chars";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/testdb";

const app = require("../server");
const db = require("../models");

const ORG_UUID = "11111111-1111-4111-8111-111111111111";

/**
 * Traversal / validation failures must never stream a file: assert the
 * response is a JSON error envelope (4xx), never 200 with file content.
 */
function assertNoFileStream(res, allowedStatuses = [400, 404]) {
  assert.ok(
    allowedStatuses.includes(res.status),
    `expected ${allowedStatuses.join(" or ")}, got ${res.status}`
  );
  assert.match(res.headers["content-type"] || "", /application\/json/);
  assert.equal(res.body.ok, false);
  assert.equal(res.body.data, null);
}

test("GET /api/media rejects non-UUID orgId with 400", async () => {
  const res = await request(app).get(`/api/media/not-a-uuid/pic.jpg`);
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
  assertNoFileStream(res);
});

test("GET /api/media rejects encoded .. traversal targeting .env", async () => {
  const res = await request(app).get(`/api/media/${ORG_UUID}/..%2F..%2F.env`);
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
  assertNoFileStream(res);
});

test("GET /api/media rejects encoded .. traversal with allowlisted extension", async () => {
  const res = await request(app).get(`/api/media/${ORG_UUID}/..%2F..%2Fsecret.jpg`);
  assertNoFileStream(res);
});

test("GET /api/media rejects fully-encoded dots-and-slash traversal", async () => {
  const res = await request(app).get(`/api/media/${ORG_UUID}/%2e%2e%2f%2e%2e%2f.env`);
  assertNoFileStream(res);
});

test("GET /api/media rejects backslash traversal", async () => {
  const res = await request(app).get(`/api/media/${ORG_UUID}/..%5C..%5Cwindows%5Cfoo.jpg`);
  assertNoFileStream(res);
});

test("GET /api/media rejects absolute-style Windows path", async () => {
  const res = await request(app).get(
    `/api/media/${ORG_UUID}/C:%5CWindows%5CSystem32%5Cdrivers%5Cetc%5Chosts.jpg`
  );
  assertNoFileStream(res);
});

test("GET /api/media rejects dotfile names", async () => {
  const res = await request(app).get(`/api/media/${ORG_UUID}/.env`);
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
  assertNoFileStream(res);
});

test("GET /api/media rejects dotfiles even with allowlisted extension", async () => {
  const res = await request(app).get(`/api/media/${ORG_UUID}/.jpg`);
  assertNoFileStream(res);
});

test("GET /api/media rejects disallowed extension", async () => {
  const res = await request(app).get(`/api/media/${ORG_UUID}/notes.txt`);
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
  assertNoFileStream(res);
});

test("GET /api/media returns 404 envelope (not a stream) for a missing valid file", async () => {
  const res = await request(app).get(`/api/media/${ORG_UUID}/missing.jpg`);
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, "NOT_FOUND");
  assertNoFileStream(res, [404]);
});

test("GET /api/media rejects raw slash traversal with 404 (unmatched route, no stream)", async () => {
  const res = await request(app).get(`/api/media/${ORG_UUID}/../../etc/passwd`);
  assertNoFileStream(res);
});

test.after(async () => {
  await db.sequelize.close().catch(() => {});
});
