const path = require("node:path");
const fs = require("node:fs");
const localEnvPath = path.resolve(__dirname, ".env");
if (!fs.existsSync(localEnvPath)) {
  require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
} else {
  require("dotenv").config();
}
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { ok } = require("./utils/response");
const env = require("./config/env");
const requestId = require("./middleware/requestId");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
const passport = require("./middleware/passport");

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
// This API serves live dashboard data; disable ETags to prevent 304 responses that can break polling clients.
app.set("etag", false);

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.midtrans.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
  })
);
app.use(requestId);
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});

const allowedOrigins = env.CORS_ORIGINS
  ? String(env.CORS_ORIGINS)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : [];

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      // When allowing all, reflect the request origin (required when credentials are used).
      if (allowedOrigins.length === 0) return cb(null, false);
      if (allowedOrigins.includes(origin)) return cb(null, origin);
      const err = new Error("Not allowed by CORS");
      err.status = 403;
      return cb(err);
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id"],
  })
);

morgan.token("reqId", (req) => req.id);
app.use(logger.http);

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  })
);

// Passport (stateless strategies: JWT/local/Google OAuth). All authenticate calls use
// session: false, so initialize() alone is sufficient — no session middleware required.
app.use(passport.initialize());

// Routes that don't require JSON parsing can be mounted before express.json().
// This prevents strict JSON parsing errors for endpoints like POST /api/sync/refresh
// when a client sends a primitive body (e.g. null) with Content-Type: application/json.
const syncRoutes = require("./routes/syncRoutes");
app.use("/api/sync", syncRoutes);

// Allow primitive JSON values (e.g. `null`) to avoid strict parsing failures.
app.use(express.json({ limit: "1mb", strict: false }));

// Static Files for Agent Updates
app.use("/agent_updates", express.static(path.join(__dirname, "../../agent_updates")));

const { mountOrgRoute, mountLegacyOnly } = require("./routes/orgRouteMapper");

const authRoutes = require("./routes/authRoutes");
mountLegacyOnly(app, "/api/auth", authRoutes);
const dashboardRoutes = require("./routes/dashboardRoutes");
mountOrgRoute(app, "/api/dashboard", dashboardRoutes);
const eodRoutes = require("./routes/eodRoutes");
mountOrgRoute(app, "/api/eod", eodRoutes);
const storeRoutes = require("./routes/storeRoutes");
mountOrgRoute(app, "/api/stores", storeRoutes);
const identityRoutes = require("./routes/identityRoutes");
mountOrgRoute(app, "/api/identity", identityRoutes);
const nikRoutes = require("./routes/nikRoutes");
mountOrgRoute(app, "/api/nik", nikRoutes);
const backupRoutes = require("./routes/backupRoutes");
mountOrgRoute(app, "/api/backups", backupRoutes);
const systemRoutes = require("./routes/systemRoutes");
mountOrgRoute(app, "/api/system", systemRoutes);
const alertsRoutes = require("./routes/alertsRoutes");
mountOrgRoute(app, "/api/alerts", alertsRoutes);
const employeeRoutes = require("./routes/employeeRoutes");
mountOrgRoute(app, "/api/employees", employeeRoutes);
const usersRoutes = require("./routes/usersRoutes");
mountOrgRoute(app, "/api/users", usersRoutes);
const rolesRoutes = require("./routes/rolesRoutes");
mountOrgRoute(app, "/api/roles", rolesRoutes);
const afterhoursRoutes = require("./routes/afterhoursRoutes");
mountOrgRoute(app, "/api/afterhours", afterhoursRoutes);
const agentRoutes = require("./routes/agentRoutes");
mountOrgRoute(app, "/api/agent", agentRoutes);
const billingRoutes = require("./routes/billingRoutes");
mountOrgRoute(app, "/api/billing", billingRoutes);
const displayRoutes = require("./routes/displayRoutes");
app.use("/display", displayRoutes);
const mediaRoutes = require("./routes/mediaRoutes");
mountOrgRoute(app, "/api/media", mediaRoutes);

app.get("/", (req, res) => {
  return ok(res, { message: "Enterprise Ops Monitor API is running" });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
