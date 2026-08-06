const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");

// mediaService reads MEDIA_ROOT at require time — point it at a throwaway dir
// so the tests never touch the real media root.
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "media-service-test-"));
process.env.MEDIA_ROOT = tmpRoot;

const mediaService = require("../../services/mediaService");

test("resolvePath", async (t) => {
  await t.test("resolves a valid relative storage path inside MEDIA_ROOT", () => {
    const rel = "11111111-1111-4111-8111-111111111111/assets/abc123.jpg";
    const resolved = mediaService.resolvePath(rel);
    assert.ok(resolved);
    assert.equal(path.resolve(resolved), path.resolve(tmpRoot, rel));
    assert.ok(path.resolve(resolved).startsWith(path.resolve(tmpRoot)));
  });

  await t.test("normalizes inner .. segments that stay inside the root", () => {
    const resolved = mediaService.resolvePath("org/assets/x/../y.jpg");
    assert.ok(resolved);
    assert.equal(path.resolve(resolved), path.resolve(tmpRoot, "org/assets/y.jpg"));
  });

  await t.test("returns null for leading .. traversal", () => {
    assert.equal(mediaService.resolvePath("../.env"), null);
  });

  await t.test("returns null for multi-level .. traversal", () => {
    assert.equal(mediaService.resolvePath("../../etc/passwd"), null);
  });

  await t.test("returns null for embedded .. traversal", () => {
    assert.equal(mediaService.resolvePath("org/../../.env"), null);
  });

  await t.test("returns null for absolute paths", () => {
    assert.equal(mediaService.resolvePath("/etc/passwd"), null);
    assert.equal(mediaService.resolvePath("/tmp/secret.jpg"), null);
  });

  await t.test("returns null when the path collapses onto the root itself", () => {
    assert.equal(mediaService.resolvePath("."), null);
  });

  await t.test("returns null for empty or missing input", () => {
    assert.equal(mediaService.resolvePath(""), null);
    assert.equal(mediaService.resolvePath(null), null);
    assert.equal(mediaService.resolvePath(undefined), null);
    assert.equal(mediaService.resolvePath(123), null);
  });

  if (process.platform === "win32") {
    await t.test("returns null for Windows absolute / drive-qualified paths", () => {
      assert.equal(mediaService.resolvePath("C:\\Windows\\system32\\config\\x.jpg"), null);
      assert.equal(mediaService.resolvePath("D:\\secret.jpg"), null);
    });
  }
});
