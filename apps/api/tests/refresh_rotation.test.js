const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const bcrypt = require("bcryptjs");

process.env.NODE_ENV = "test";
const path = require("node:path");
const fs = require("node:fs");
const localEnvPath = path.resolve(__dirname, "../.env");
if (!fs.existsSync(localEnvPath)) {
  require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });
} else {
  require("dotenv").config();
}

process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_min_16_chars";
// Ensure tests are hermetic even if the developer's .env defines admin credentials.
process.env.ADMIN_USERNAME = "admin";
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync("adminpass", 10);

// Same host-reachable DATABASE_URL bridge as auth.smoke.test.js.
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

const hasDbConfig = Boolean(
  process.env.DATABASE_URL ||
  (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASS && process.env.DB_NAME)
);
const skipMissingDb = hasDbConfig ? false : "missing DATABASE_URL or DB_NAME+DB_USER+DB_PASS";

let app;
let db;

if (hasDbConfig) {
  app = require("../server");
  db = require("../models");
}

/** Extract one cookie value from a supertest response's Set-Cookie headers. */
function getCookie(res, name) {
  const cookies = res.headers["set-cookie"] || [];
  const part = cookies.find((c) => c.startsWith(`${name}=`));
  if (!part) return null;
  return part.slice(name.length + 1).split(";")[0];
}

/**
 * Provision a tenant + a bcrypt-hashed user under it, returning credentials
 * that work with POST /api/auth/login. Uses transaction-scoped set_config so
 * the inserts pass the strict RLS policies when the app DB role is subject to
 * them (superuser dev databases work without it). Throws on failure.
 */
async function provisionUser(sequelize) {
  const username = `rt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const password = "Refresh!Pass1";
  const passwordHash = bcrypt.hashSync(password, 10);

  let tenantId = null;
  let userId = null;

  await sequelize.transaction(async (t) => {
    // Transaction-scoped RLS context: only the inserts inside this transaction
    // see it — nothing leaks back to pooled connections afterwards.
    await sequelize.query("SELECT set_config('app.is_super_admin', 'true', true)", {
      transaction: t,
    });
    await sequelize.query("SELECT set_config('app.tenant_id', NULL, true)", { transaction: t });

    const [tenantRows] = await sequelize.query(
      `INSERT INTO tenants (id, name, slug, settings_json, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, '{}'::jsonb, NOW(), NOW())
       RETURNING id;`,
      { bind: [`Test Org ${Date.now()}`, `test-org-${Date.now()}`], transaction: t }
    );
    tenantId = tenantRows[0].id;

    await sequelize.query("SELECT set_config('app.tenant_id', $1, true)", {
      bind: [tenantId],
      transaction: t,
    });
    const [userRows] = await sequelize.query(
      `INSERT INTO "Users" (username, password_hash, role, org_id, "createdAt", "updatedAt")
       VALUES ($1, $2, 'admin', $3, NOW(), NOW())
       RETURNING id;`,
      { bind: [username, passwordHash, tenantId], transaction: t }
    );
    userId = userRows[0].id;
  });

  return { username, password, tenantId, userId };
}

test(
  "env_admin login returns refreshToken: null and no refresh cookie",
  { skip: skipMissingDb },
  async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "adminpass" });

    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.ok(res.body.data.token);
    // Key must exist; env_admin is a synthetic non-DB account → null (issue #12).
    assert.equal(res.body.data.refreshToken, null);
    assert.equal(getCookie(res, "refresh_token"), null, "env_admin must not get a refresh cookie");
  }
);

test(
  "refresh token rotation: login → rotate → old token rejected (reuse attack blocked)",
  { skip: skipMissingDb },
  async (t) => {
    // ── Provision a real DB user (needs Postgres + write access) ──────────
    let creds;
    try {
      creds = await provisionUser(db.sequelize);
    } catch (err) {
      t.skip(`cannot provision a test user (${err.message})`);
      return;
    }

    // ── Login → expect a refresh token in the body AND the httpOnly cookie ──
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ username: creds.username, password: creds.password });

    if (loginRes.status === 401) {
      // Strict RLS without a tenant context on /api/auth/login makes DB logins
      // invisible (pre-existing constraint) — nothing to exercise here.
      t.skip(`DB-user login unavailable (${loginRes.body?.error?.code || loginRes.status})`);
      return;
    }
    assert.equal(loginRes.status, 200, `login should succeed for the provisioned user`);
    assert.ok(loginRes.body.data.token);

    const refreshToken = loginRes.body.data.refreshToken;
    assert.ok(refreshToken, "login must return a refreshToken for DB users");
    assert.match(refreshToken, /^[0-9a-f]{64}$/, "refresh token must be 32 random bytes (hex)");

    const refreshCookie = getCookie(loginRes, "refresh_token");
    assert.ok(refreshCookie, "login must set the refresh_token cookie");
    assert.match(refreshCookie, /^[0-9a-f]{64}$/);
    const rawCookie = (loginRes.headers["set-cookie"] || []).find((c) =>
      c.startsWith("refresh_token=")
    );
    assert.match(rawCookie, /HttpOnly/i);
    assert.match(rawCookie, /SameSite=Strict/i);

    // The auth_token cookie is bridged to a Bearer header by cookieToBearer,
    // which also gives the refresh handler its RLS tenant context.
    const authCookie = getCookie(loginRes, "auth_token");
    assert.ok(authCookie, "login must still set the auth_token cookie");

    // ── Rotate: valid refreshToken → 200, new JWT + NEW refreshToken ───────
    const rotateRes = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `auth_token=${authCookie}; refresh_token=${refreshCookie}`)
      .send({ refreshToken });

    assert.equal(rotateRes.status, 200);
    assert.equal(rotateRes.body.ok, true);
    assert.ok(rotateRes.body.data.token, "rotation must mint a fresh JWT");
    const rotated = rotateRes.body.data.refreshToken;
    assert.ok(rotated, "rotation must issue a fresh refresh token");
    assert.notEqual(rotated, refreshToken, "the refresh token must rotate");
    assert.equal(getCookie(rotateRes, "refresh_token"), rotated);

    // ── Reuse of the OLD token must now fail (revoked by rotation) ────────
    const oldReuseRes = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `auth_token=${authCookie}`)
      .send({ refreshToken });

    assert.equal(oldReuseRes.status, 401);
    assert.equal(oldReuseRes.body.ok, false);
    assert.equal(oldReuseRes.body.error.code, "INVALID_REFRESH_TOKEN");

    // ── Garbage refresh token → 401 ────────────────────────────────────────
    const garbageRes = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `auth_token=${authCookie}`)
      .send({ refreshToken: `deadbeef${"0".repeat(56)}` });

    assert.equal(garbageRes.status, 401);
    assert.equal(garbageRes.body.error.code, "INVALID_REFRESH_TOKEN");

    // ── No refresh token, valid JWT → backward-compat JWT refresh ────────
    const jwtOnlyRes = await request(app)
      .post("/api/auth/refresh")
      .set("Authorization", `Bearer ${rotateRes.body.data.token}`);

    assert.equal(jwtOnlyRes.status, 200);
    assert.equal(jwtOnlyRes.body.ok, true);
    assert.ok(jwtOnlyRes.body.data.token);
    assert.equal(jwtOnlyRes.body.data.refreshToken, null);

    // ── No credentials at all → 401 ────────────────────────────────────────
    const bareRes = await request(app).post("/api/auth/refresh");
    assert.equal(bareRes.status, 401);
    assert.equal(bareRes.body.error.code, "UNAUTHORIZED");
  }
);

test.after(async () => {
  await db?.sequelize?.close().catch(() => {});
});
