function setPrivateCache(maxAgeSeconds = 15, staleWhileRevalidateSeconds = 30) {
  const maxAge = Math.max(0, Number.parseInt(String(maxAgeSeconds), 10) || 0);
  const staleWhileRevalidate = Math.max(
    0,
    Number.parseInt(String(staleWhileRevalidateSeconds), 10) || 0
  );

  return function privateCacheHeader(_req, res, next) {
    res.set(
      "Cache-Control",
      `private, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
    );
    next();
  };
}

function noStore(_req, res, next) {
  res.set("Cache-Control", "no-store");
  next();
}

module.exports = { setPrivateCache, noStore };
