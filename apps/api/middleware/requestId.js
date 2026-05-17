const crypto = require("crypto");

function buildRequestId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return crypto.randomBytes(16).toString("hex");
}

module.exports = function requestId(req, res, next) {
  const incoming = req.headers["x-request-id"];
  const id = incoming && typeof incoming === "string" ? incoming : buildRequestId();
  req.id = id;
  res.setHeader("X-Request-Id", id);
  return next();
};
