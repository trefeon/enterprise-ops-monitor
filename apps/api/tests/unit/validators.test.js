const { test } = require("node:test");
const assert = require("node:assert/strict");
const { passwordSchema } = require("../../utils/validators");

test("password schema validation", async (t) => {
  await t.test("accepts valid password", () => {
    // 8 chars, 1 upper, 1 lower, 1 number, 1 special
    const valid = "StrongP@ss1";
    const result = passwordSchema.safeParse(valid);
    assert.equal(result.success, true);
  });

  await t.test("rejects too short password", () => {
    const invalid = "Sh0rt!";
    const result = passwordSchema.safeParse(invalid);
    assert.equal(result.success, false);
    assert.match(result.error.message, /at least 8 characters/);
  });

  await t.test("rejects too long password", () => {
    const invalid = "a".repeat(129);
    const result = passwordSchema.safeParse(invalid);
    assert.equal(result.success, false);
    assert.match(result.error.message, /at most 128 characters/);
  });

  await t.test("rejects password without uppercase", () => {
    const invalid = "weakpass1!";
    const result = passwordSchema.safeParse(invalid);
    assert.equal(result.success, false);
    assert.match(result.error.message, /uppercase/);
  });

  await t.test("rejects password without lowercase", () => {
    const invalid = "WEAKPASS1!";
    const result = passwordSchema.safeParse(invalid);
    assert.equal(result.success, false);
    assert.match(result.error.message, /lowercase/);
  });

  await t.test("rejects password without number", () => {
    const invalid = "WeakPass!";
    const result = passwordSchema.safeParse(invalid);
    assert.equal(result.success, false);
    assert.match(result.error.message, /number/);
  });

  await t.test("rejects password without special char", () => {
    const invalid = "WeakPass1";
    const result = passwordSchema.safeParse(invalid);
    assert.equal(result.success, false);
    assert.match(result.error.message, /special character/);
  });
});
