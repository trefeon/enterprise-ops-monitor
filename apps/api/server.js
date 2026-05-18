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
const db = require("./models");
const { ok } = require("./utils/response");
const env = require("./config/env");
const requestId = require("./middleware/requestId");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const ensureDb = require("./utils/ensureDb");
const ensureDefaultUsers = require("./utils/ensureDefaultUsers");
const { startDataScheduler } = require("./services/dataScheduler");

const app = express();
const port = env.PORT;

app.disable("x-powered-by");
app.set("trust proxy", 1);
// This API serves live dashboard data; disable ETags to prevent 304 responses that can break polling clients.
app.set("etag", false);

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
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
      if (allowedOrigins.length === 0) return cb(null, origin);
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
app.use(morgan(":method :url :status :response-time ms - reqId=:reqId"));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  })
);

// Routes that don't require JSON parsing can be mounted before express.json().
// This prevents strict JSON parsing errors for endpoints like POST /api/sync/refresh
// when a client sends a primitive body (e.g. null) with Content-Type: application/json.
const syncRoutes = require("./routes/syncRoutes");
app.use("/api/sync", syncRoutes);

// Allow primitive JSON values (e.g. `null`) to avoid strict parsing failures.
app.use(express.json({ limit: "1mb", strict: false }));

// Static Files for Agent Updates
app.use("/agent_updates", express.static(path.join(__dirname, "../../agent_updates")));

// Routes
const authRoutes = require("./routes/authRoutes");

app.use("/api/auth", authRoutes);
const dashboardRoutes = require("./routes/dashboardRoutes");
app.use("/api/dashboard", dashboardRoutes);
const eodRoutes = require("./routes/eodRoutes");
app.use("/api/eod", eodRoutes);
const storeRoutes = require("./routes/storeRoutes");
app.use("/api/stores", storeRoutes);
const identityRoutes = require("./routes/identityRoutes");
app.use("/api/identity", identityRoutes);
const nikRoutes = require("./routes/nikRoutes");
app.use("/api/nik", nikRoutes);
const backupRoutes = require("./routes/backupRoutes");
app.use("/api/backups", backupRoutes);
const systemRoutes = require("./routes/systemRoutes");
app.use("/api/system", systemRoutes);
const alertsRoutes = require("./routes/alertsRoutes");
app.use("/api/alerts", alertsRoutes);
const employeeRoutes = require("./routes/employeeRoutes");
app.use("/api/employees", employeeRoutes);
const usersRoutes = require("./routes/usersRoutes");
app.use("/api/users", usersRoutes);
const rolesRoutes = require("./routes/rolesRoutes");
app.use("/api/roles", rolesRoutes);
const afterhoursRoutes = require("./routes/afterhoursRoutes");
app.use("/api/afterhours", afterhoursRoutes);
const agentRoutes = require("./routes/agentRoutes");
app.use("/api/agent", agentRoutes);

app.get("/", (req, res) => {
  return ok(res, { message: "Enterprise Ops Monitor API is running" });
});

app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  app.listen(port, async () => {
    try {
      await db.sequelize.authenticate();
      await ensureDb(db);

      // Keep internal data-derived DB tables fresh (optional; controlled by env).
      try {
        startDataScheduler();
      } catch {
        // Silent
      }

      try {
        const seeded = await ensureDefaultUsers();
        if (seeded?.enabled) {
          const summary = (seeded.results || [])
            .map((r) =>
              r?.skipped
                ? `skipped(${r.reason})`
                : r.created
                  ? "created"
                  : r.updated
                    ? "updated"
                    : "ok"
            )
            .join(", ");
          console.log(`[startup] Default users ensured: ${summary}`);
        }
      } catch (e) {
        console.warn("[startup] ensureDefaultUsers failed (non-fatal):", e?.message || e);
      }

      // Sync models (careful in production)
      // await db.sequelize.sync({ alter: true });
    } catch (error) {
      console.error("Unable to connect to the database:", error);
    }
  });
}

module.exports = app;
