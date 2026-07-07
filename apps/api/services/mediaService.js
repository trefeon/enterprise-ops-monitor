const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { v4: uuidv4 } = require("uuid");

const MEDIA_ROOT = process.env.MEDIA_ROOT || "/data/media";

/**
 * LocalDiskMediaService — stores uploaded media on the local filesystem.
 *
 * Directory layout:
 *   {MEDIA_ROOT}/{orgId}/assets/{uuid}.{ext}
 *   {MEDIA_ROOT}/{orgId}/thumbnails/{uuid}.{ext}
 */
class LocalDiskMediaService {
  /**
   * Upload a file buffer to disk and return its relative storage path.
   * @param {string} orgId  Organization UUID
   * @param {Buffer} buffer File contents
   * @param {string} mimeType  MIME type (e.g. image/jpeg)
   * @param {string} originalName Original filename
   * @returns {Promise<{storagePath: string, filename: string}>}
   */
  async upload(orgId, buffer, mimeType, originalName) {
    const ext = this._extFromMime(mimeType) || path.extname(originalName) || ".bin";
    const filename = `${uuidv4()}${ext}`;
    const relativePath = `${orgId}/assets/${filename}`;
    const fullPath = path.join(MEDIA_ROOT, relativePath);

    await fsp.mkdir(path.dirname(fullPath), { recursive: true });
    await fsp.writeFile(fullPath, buffer);

    return { storagePath: relativePath, filename };
  }

  /**
   * Get the public URL for a stored file.
   */
  getUrl(relativePath) {
    if (!relativePath) return null;
    // relativePath format: {orgId}/assets/{filename}
    const parts = relativePath.split("/");
    const orgId = parts[0];
    const name = parts[parts.length - 1];
    return `/api/media/${orgId}/${name}`;
  }

  /**
   * Delete a stored file by its relative path.
   */
  async delete(relativePath) {
    if (!relativePath) return;
    const fullPath = path.join(MEDIA_ROOT, relativePath);
    try {
      await fsp.unlink(fullPath);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
  }

  /**
   * Return the absolute filesystem path for a relative storage path.
   */
  resolvePath(relativePath) {
    if (!relativePath) return null;
    return path.join(MEDIA_ROOT, relativePath);
  }

  /**
   * Derive a file extension from a MIME type.
   */
  _extFromMime(mimeType) {
    const map = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "video/mp4": ".mp4",
      "video/webm": ".webm",
    };
    return map[mimeType] || null;
  }
}

module.exports = new LocalDiskMediaService();
/* service: mediaService */
