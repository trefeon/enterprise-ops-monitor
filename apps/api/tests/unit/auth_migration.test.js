const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert");
const crypto = require("crypto");
const path = require("path");
const bcrypt = require("bcryptjs");

// -- MOCKING INFRASTRUCTURE --
// We populate require.cache to intercept require() calls in the controller.

const baseDir = path.resolve(__dirname, "../../");

// Mocks
const mockUser = {
  findOne: async () => null,
};

const mockEnv = {
  JWT_SECRET: "mock_secret_key_1234567890123456", // must be >= 16 chars
  ADMIN_USERNAME: "env_admin",
  ADMIN_PASSWORD_HASH: "$2a$10$XXXXXXXXXXXXXXXXXXXXXX", // Mock
};

const mockResponse = {
  ok: (res, data) => res.json({ ok: true, ...data }),
  fail: (res, status, code, msg) => res.status(status).json({ ok: false, error: msg }),
};

const mockRoleMap = {
  normalizeRole: (r) => r || "viewer",
};

const mockAuthz = {
  loadUserAuthz: async () => null,
};

// Intercept requires
// Note: We need to ensure these paths match exactly what node resolves, or use module-alias.
// But since we know the relative paths used in authController:
// ../models, ../utils/response, ../utils/roleMap, ../services/authzService, ../config/env

const mockModules = {
  [path.join(baseDir, "models/index.js")]: { User: mockUser },
  [path.join(baseDir, "utils/response.js")]: mockResponse,
  [path.join(baseDir, "utils/roleMap.js")]: mockRoleMap,
  [path.join(baseDir, "services/authzService.js")]: mockAuthz,
  [path.join(baseDir, "config/env.js")]: mockEnv,
};

Object.keys(mockModules).forEach((absPath) => {
  require.cache[absPath] = {
    id: absPath,
    filename: absPath,
    loaded: true,
    exports: mockModules[absPath],
  };
});

// Now require the controller
const authController = require("../../controllers/authController");

describe("Auth Controller - Password Migration", () => {
  let req, res;
  let statusCode;

  beforeEach(() => {
    req = { body: {}, headers: {} };
    statusCode = 200;
    res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: () => {
        return res;
      },
      setHeader: () => {},
    };
    // Reset mocks
    mockUser.findOne = async () => null;
  });

  it("should migrate SHA256 password to Bcrypt on successful login", async () => {
    const password = "mysecretpassword";
    const sha256Hash = crypto.createHash("sha256").update(password).digest("hex");

    let updateCalled = false;
    let updatedFields = null;

    mockUser.findOne = async ({ where }) => {
      if (where.username === "legacy_user") {
        return {
          id: 1,
          username: "legacy_user",
          password_hash: sha256Hash,
          role: "viewer",
          update: async (fields) => {
            updateCalled = true;
            updatedFields = fields;
          },
        };
      }
      return null;
    };

    req.body = { username: "legacy_user", password };
    await authController.login(req, res);

    assert.strictEqual(statusCode, 200, "Login should succeed");
    assert.strictEqual(updateCalled, true, "User.update should be called");
    assert.ok(
      updatedFields.password_hash.startsWith("$2"),
      "Password should be updated to Bcrypt hash"
    );
  });

  it("should NOT migrate Bcrypt password on successful login", async () => {
    const password = "mysecretpassword";
    const bcryptHash = await bcrypt.hash(password, 10);

    let updateCalled = false;

    mockUser.findOne = async ({ where }) => {
      if (where.username === "modern_user") {
        return {
          id: 2,
          username: "modern_user",
          password_hash: bcryptHash, // Already bcrypt
          role: "viewer",
          update: async () => {
            updateCalled = true;
          },
        };
      }
      return null;
    };

    req.body = { username: "modern_user", password };
    await authController.login(req, res);

    assert.strictEqual(statusCode, 200, "Login should succeed");
    assert.strictEqual(updateCalled, false, "User.update should NOT be called");
  });
});
