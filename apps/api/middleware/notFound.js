const { fail } = require("../utils/response");

module.exports = function notFound(req, res) {
  return fail(res, 404, "NOT_FOUND", "Route not found", {
    path: req.originalUrl,
    method: req.method,
    requestId: req.id || null,
  });
};
