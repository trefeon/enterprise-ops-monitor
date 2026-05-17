const { ZodError } = require("zod");
const { fail } = require("../utils/response");

function isSequelizeValidationError(err) {
  return (
    err &&
    (err.name === "SequelizeValidationError" || err.name === "SequelizeUniqueConstraintError")
  );
}

module.exports = function errorHandler(err, req, res, _next) {
  const requestId = req?.id || null;

  if (err instanceof ZodError) {
    console.error("Validation Error:", JSON.stringify(err.issues, null, 2));
    const firstIssue = err.issues?.[0]?.message;
    const message = firstIssue ? `Invalid request: ${firstIssue}` : "Invalid request";
    return fail(res, 400, "VALIDATION_ERROR", message, {
      requestId,
      issues: err.issues,
    });
  }

  if (isSequelizeValidationError(err)) {
    return fail(res, 400, "VALIDATION_ERROR", "Invalid data", {
      requestId,
      errors: err.errors?.map((e) => ({ message: e.message, path: e.path, type: e.type })) || [],
    });
  }

  // Respect explicit HTTP status where controllers/middleware set it
  const status = Number.isInteger(err?.status) ? err.status : 500;

  // Avoid leaking details in production
  const safeMessage = status >= 500 ? "Internal server error" : err?.message || "Request failed";

  // eslint-disable-next-line no-console
  console.error("Unhandled API error:", {
    requestId,
    name: err?.name,
    message: err?.message,
    stack: err?.stack,
  });

  return fail(res, status, status >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST", safeMessage, {
    requestId,
  });
};
