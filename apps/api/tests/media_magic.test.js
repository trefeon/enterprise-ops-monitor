const test = require("node:test");
const assert = require("node:assert/strict");

const { detectMimeFromBuffer } = require("../utils/magicMime");

function sig(...bytes) {
  return Buffer.from(bytes);
}

test("JPEG magic bytes (FF D8 FF) → image/jpeg", () => {
  const buf = sig(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46);
  assert.equal(detectMimeFromBuffer(buf), "image/jpeg");
});

test("PNG magic bytes (89 50 4E 47 0D 0A 1A 0A) → image/png", () => {
  const buf = sig(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00);
  assert.equal(detectMimeFromBuffer(buf), "image/png");
});

test("WEBP magic bytes (RIFF....WEBP) → image/webp", () => {
  const buf = Buffer.concat([
    Buffer.from("RIFF"),
    Buffer.from([0x24, 0x00, 0x00, 0x00]),
    Buffer.from("WEBP"),
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
  ]);
  assert.equal(detectMimeFromBuffer(buf), "image/webp");
});

test("MP4 magic bytes (....ftyp) → video/mp4", () => {
  const buf = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x20]),
    Buffer.from("ftypisom"),
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
  ]);
  assert.equal(detectMimeFromBuffer(buf), "video/mp4");
});

test("WebM magic bytes (1A 45 DF A3) → video/webm", () => {
  const buf = sig(0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81);
  assert.equal(detectMimeFromBuffer(buf), "video/webm");
});

test("plain text buffer → null", () => {
  assert.equal(detectMimeFromBuffer(Buffer.from("hello world, definitely not an image")), null);
});

test("empty / tiny buffers → null", () => {
  assert.equal(detectMimeFromBuffer(Buffer.alloc(0)), null);
  assert.equal(detectMimeFromBuffer(sig(0xff, 0xd8)), null); // JPEG needs 3 bytes
});

test("non-buffer input → null", () => {
  assert.equal(detectMimeFromBuffer("FFD8FF"), null);
  assert.equal(detectMimeFromBuffer(null), null);
  assert.equal(detectMimeFromBuffer(undefined), null);
});
