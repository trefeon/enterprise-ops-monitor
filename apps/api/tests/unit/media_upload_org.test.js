const { beforeEach, mock, test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const request = require("supertest");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_min_16_chars";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/testdb";

const baseDir = path.resolve(__dirname, "../../");

// Multer writes the temp upload before the handler runs, so requests rejected
// before cleanup leave temp files — track and remove only what this run creates.
const uploadsDir = path.join(baseDir, "uploads");
const preExistingUploads = new Set(fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : []);

test.after(() => {
  if (!fs.existsSync(uploadsDir)) return;
  for (const f of fs.readdirSync(uploadsDir)) {
    if (!preExistingUploads.has(f)) {
      try {
        fs.rmSync(path.join(uploadsDir, f));
      } catch {
        // already gone
      }
    }
  }
});

// ---- Module mocks (no Postgres, no disk writes) ----
const mediaServiceMock = {
  upload: mock.fn(async () => ({ storagePath: "org/assets/uuid.jpg", filename: "uuid.jpg" })),
  resolvePath: mock.fn(() => null),
  delete: mock.fn(async () => {}),
  getUrl: mock.fn(() => null),
};

const dbMock = {
  Sequelize: { QueryTypes: {} },
  sequelize: {
    query: mock.fn(async () => []),
    close: mock.fn(async () => {}),
  },
  MediaAsset: { create: mock.fn(async (data) => ({ id: "asset-1", ...data })) },
};

// Auth is mocked so the org-derivation logic can be exercised without a DB
// user lookup. The mock mirrors authMiddleware's contract: req.user carries
// the JWT identity (id + orgId claim), req.authz the permissions.
const authState = { user: null };
const authMock = mock.fn(async (req, _res, next) => {
  req.user = authState.user;
  if (authState.user) {
    req.authz = {
      userId: authState.user.id,
      roleNames: ["org_admin"],
      rolePerms: ["MEDIA_EDIT"],
      effectivePerms: ["MEDIA_EDIT"],
      overridesAllow: [],
      overridesDeny: [],
      scopeBranches: [],
      isAllBranches: true,
      orgId: authState.user.orgId || null,
    };
  }
  next();
});

const mockModules = {
  [path.join(baseDir, "models/index.js")]: dbMock,
  [path.join(baseDir, "services/mediaService.js")]: mediaServiceMock,
  [path.join(baseDir, "middleware/authMiddleware.js")]: authMock,
};

Object.entries(mockModules).forEach(([absPath, exports]) => {
  require.cache[absPath] = { id: absPath, filename: absPath, loaded: true, exports };
});

const express = require("express");
const mediaRoutes = require("../../routes/mediaRoutes");
const tenantMiddleware = require("../../middleware/tenantMiddleware");

function buildApp() {
  const app = express();
  // Legacy mount (matches app.js mountOrgRoute legacy path — no tenant middleware)
  app.use("/api/media", mediaRoutes);
  // Org-scoped mount (matches app.js mountOrgRoute org path — with tenant middleware)
  app.use("/api/orgs/:orgId/media", tenantMiddleware, mediaRoutes);
  return app;
}

const ORG_UUID = "11111111-1111-4111-8111-111111111111";
const OTHER_UUID = "22222222-2222-4222-8222-222222222222";

const app = buildApp();

function postUpload(url, bodyFields = {}) {
  const req = request(app).post(url).attach("file", Buffer.from("fake-jpeg-content"), {
    filename: "menu-pic.jpg",
    contentType: "image/jpeg",
  });
  for (const [name, value] of Object.entries(bodyFields)) {
    req.field(name, value);
  }
  return req;
}

beforeEach(() => {
  authState.user = null;
  mediaServiceMock.upload.mock.resetCalls();
  dbMock.MediaAsset.create.mock.resetCalls();
});

test("upload derives orgId from the JWT orgId claim (legacy path)", async () => {
  authState.user = { id: "user-1", username: "alice", role: "org_admin", orgId: ORG_UUID };
  const res = await postUpload("/api/media/upload");

  assert.equal(res.status, 201);
  assert.equal(res.body.ok, true);

  assert.equal(mediaServiceMock.upload.mock.calls.length, 1);
  assert.equal(mediaServiceMock.upload.mock.calls[0].arguments[0], ORG_UUID);

  const createArgs = dbMock.MediaAsset.create.mock.calls[0].arguments[0];
  assert.equal(createArgs.org_id, ORG_UUID);
  assert.equal(createArgs.uploaded_by, "user-1");
});

test("upload rejects a client-supplied orgId that mismatches the authenticated org", async () => {
  authState.user = { id: "user-1", username: "alice", role: "org_admin", orgId: ORG_UUID };
  const res = await postUpload("/api/media/upload", { orgId: OTHER_UUID });

  assert.equal(res.status, 403);
  assert.equal(res.body.ok, false);
  assert.equal(res.body.error.code, "TENANT_MISMATCH");
  assert.equal(mediaServiceMock.upload.mock.calls.length, 0);
  assert.equal(dbMock.MediaAsset.create.mock.calls.length, 0);
});

test("upload allows a client-supplied orgId that matches the authenticated org", async () => {
  authState.user = { id: "user-1", username: "alice", role: "org_admin", orgId: ORG_UUID };
  const res = await postUpload("/api/media/upload", { orgId: ORG_UUID });

  assert.equal(res.status, 201);
  assert.equal(mediaServiceMock.upload.mock.calls.length, 1);
});

test("upload returns 400 when the authenticated user has no organization", async () => {
  authState.user = { id: "user-1", username: "alice", role: "org_admin", orgId: null };
  const res = await postUpload("/api/media/upload");

  assert.equal(res.status, 400);
  assert.equal(res.body.ok, false);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
  assert.match(res.body.error.message, /organization/i);
  assert.equal(mediaServiceMock.upload.mock.calls.length, 0);
});

test("upload derives orgId from the org-scoped URL tenant (req.tenantId)", async () => {
  authState.user = { id: "user-1", username: "alice", role: "org_admin", orgId: null };
  const res = await postUpload(`/api/orgs/${ORG_UUID}/media/upload`);

  assert.equal(res.status, 201);
  assert.equal(mediaServiceMock.upload.mock.calls.length, 1);
  assert.equal(mediaServiceMock.upload.mock.calls[0].arguments[0], ORG_UUID);

  const createArgs = dbMock.MediaAsset.create.mock.calls[0].arguments[0];
  assert.equal(createArgs.org_id, ORG_UUID);
});

test("upload rejects a non-UUID tenant orgId before any filesystem work", async () => {
  authState.user = { id: "user-1", username: "alice", role: "org_admin", orgId: null };
  const res = await postUpload("/api/orgs/not-a-uuid/media/upload");

  // Rejected at 400 before any fs access — either by tenantMiddleware's UUID
  // gate (INVALID_ORG_ID) or by the route's own UUID check (VALIDATION_ERROR).
  assert.equal(res.status, 400);
  assert.equal(res.body.ok, false);
  assert.ok(
    ["VALIDATION_ERROR", "INVALID_ORG_ID"].includes(res.body.error.code),
    `unexpected error code: ${res.body.error.code}`
  );
  assert.equal(mediaServiceMock.upload.mock.calls.length, 0);
  assert.equal(dbMock.MediaAsset.create.mock.calls.length, 0);
});

test("env_admin upload stores uploaded_by NULL instead of the FK-violating id", async () => {
  authState.user = { id: "env_admin", username: "env_admin", role: "super_admin", orgId: null };
  const res = await postUpload(`/api/orgs/${ORG_UUID}/media/upload`);

  assert.equal(res.status, 201);
  assert.equal(mediaServiceMock.upload.mock.calls.length, 1);
  assert.equal(mediaServiceMock.upload.mock.calls[0].arguments[0], ORG_UUID);

  const createArgs = dbMock.MediaAsset.create.mock.calls[0].arguments[0];
  assert.equal(createArgs.org_id, ORG_UUID);
  assert.equal(createArgs.uploaded_by, null);
});
