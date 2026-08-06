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
   *
   * SECURITY: the resolved path must stay inside MEDIA_ROOT. Any `..`
   * traversal, absolute path, or resolution that escapes the root returns
   * null so callers treat it as "not found" before touching the filesystem.
   *
   * @param {string} relativePath Relative storage path (e.g. `{orgId}/assets/{file}`)
   * @returns {string|null} Absolute path guaranteed inside MEDIA_ROOT, or null when unsafe
   */
  resolvePath(relativePath) {
    if (!relativePath || typeof relativePath !== "string") return null;
    if (path.isAbsolute(relativePath)) return null;

    const root = path.resolve(MEDIA_ROOT);
    const fullPath = path.resolve(root, relativePath);

    // path.relative performs a case-insensitive comparison on win32 (and is
    // case-sensitive elsewhere), so lowercasing here is belt-and-suspenders.
    const rel = path.relative(root, fullPath);
    const relForCompare = process.platform === "win32" ? rel.toLowerCase() : rel;

    // rel === "" means fullPath IS the root directory (never a file to serve).
    // rel ".." / "../…" / "..\…" or a different drive means the path escapes.
    if (
      relForCompare === "" ||
      relForCompare === ".." ||
      relForCompare.startsWith(".." + path.sep) ||
      path.isAbsolute(rel)
    ) {
      return null;
    }

    return fullPath;
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
