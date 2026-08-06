/**
 * Magic-byte MIME detection (issue #14).
 *
 * The MIME type a client declares in a multipart upload is fully
 * client-controlled and must not be trusted for storage. This helper sniffs
 * the file's leading bytes and returns the authoritative MIME type, or null
 * when the content matches no known signature. mediaRoutes.js rejects any
 * upload whose detected type differs from the declared type and stores the
 * DETECTED type as the source of truth.
 */

/**
 * Detect the real MIME type of a file buffer from its magic bytes.
 * @param {Buffer} buffer
 * @returns {string|null} one of image/jpeg, image/png, image/webp,
 *   video/mp4, video/webm — or null when the signature is unknown.
 */
function detectMimeFromBuffer(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  const len = buffer.length;

  // JPEG: FF D8 FF
  if (len >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    len >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WEBP: "RIFF" at 0..3 AND "WEBP" at 8..11
  if (
    len >= 12 &&
    buffer.toString("latin1", 0, 4) === "RIFF" &&
    buffer.toString("latin1", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  // MP4: "ftyp" at 4..7 (the file may be an ISO BMFF container)
  if (len >= 12 && buffer.toString("latin1", 4, 8) === "ftyp") {
    return "video/mp4";
  }

  // WebM (EBML): 1A 45 DF A3
  if (
    len >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return "video/webm";
  }

  return null;
}

module.exports = { detectMimeFromBuffer };
