const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const bcrypt = require("bcryptjs");

process.env.NODE_ENV = "test";
require("dotenv").config();

process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_min_16_chars";
// Ensure tests are hermetic even if the developer's .env defines admin credentials.
process.env.ADMIN_USERNAME = "admin";
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync("adminpass", 10);

// Many dev setups use DB_HOST=db for containers, but tests run on the host.
// If Postgres is published to localhost:5432 (as in this repo's compose), force
// a host-reachable DATABASE_URL for the test run.
if (
  !process.env.DATABASE_URL &&
  process.env.DB_USER &&
  process.env.DB_PASS &&
  process.env.DB_NAME
) {
  const user = encodeURIComponent(String(process.env.DB_USER));
  const pass = encodeURIComponent(String(process.env.DB_PASS));
  const dbName = encodeURIComponent(String(process.env.DB_NAME));
  const hostRaw = String(process.env.DB_HOST || "localhost");
  const host = hostRaw === "db" ? "localhost" : hostRaw;
  const port = String(process.env.DB_PORT || "5432");
  process.env.DATABASE_URL = `postgresql://${user}:${pass}@${host}:${port}/${dbName}`;
}

const app = require("../server");
const db = require("../models");

const hasDbConfig = Boolean(
  process.env.DATABASE_URL ||
  (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASS && process.env.DB_NAME)
);

test("auth login and logout return envelope", { skip: !hasDbConfig }, async () => {
  const badRes = await request(app).post("/api/auth/login").send({ username: "admin" });
  assert.equal(badRes.status, 400);
  assert.equal(badRes.body.ok, false);
  assert.equal(badRes.body.error.code, "VALIDATION_ERROR");

  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ username: "admin", password: "adminpass" });

  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.body.ok, true);
  assert.ok(loginRes.body.data.token);

  const token = loginRes.body.data.token;
  const logoutRes = await request(app)
    .post("/api/auth/logout")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(logoutRes.status, 200);
  assert.equal(logoutRes.body.ok, true);
  assert.equal(logoutRes.body.data.message, "Logout successful");
});

test.after(async () => {
  await db.sequelize.close().catch(() => {});
});
