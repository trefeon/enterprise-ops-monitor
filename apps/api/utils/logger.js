const morgan = require("morgan");

const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const level = process.env.LOG_LEVEL || "info";

function shouldLog(l) {
  return (levels[l] || 0) <= (levels[level] || 2);
}

function _format(args) {
  return args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
}

const logger = {
  error: (...args) => {
    if (shouldLog("error")) console.error("[api]", ...args);
  },
  warn: (...args) => {
    if (shouldLog("warn")) console.warn("[api]", ...args);
  },
  info: (...args) => {
    if (shouldLog("info")) console.info("[api]", ...args);
  },
  debug: (...args) => {
    if (shouldLog("debug")) console.debug("[api]", ...args);
  },
  http: morgan(":method :url :status :response-time ms - reqId=:reqId"),
};

module.exports = logger;
