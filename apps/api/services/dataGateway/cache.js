class TTLCache {
  constructor() {
    this.cache = new Map();
    this.inFlight = new Map();
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlMs) {
    this.cache.set(key, { value, expiresAt: Date.now() + Math.max(0, ttlMs || 0) });
  }

  delete(key) {
    this.cache.delete(key);
  }

  async cached(key, ttlMs, fetcher, { bypassCache = false } = {}) {
    if (!bypassCache) {
      const cached = this.get(key);
      if (cached) return { value: cached, source: "cache" };
      if (this.inFlight.has(key)) return { value: await this.inFlight.get(key), source: "cache" };
    }

    const promise = (async () => {
      const value = await fetcher();
      this.set(key, value, ttlMs);
      return value;
    })();

    this.inFlight.set(key, promise);
    try {
      const value = await promise;
      return { value, source: "live" };
    } finally {
      this.inFlight.delete(key);
    }
  }
}

module.exports = {
  TTLCache,
};
