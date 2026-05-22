const { z } = require("zod");

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).optional().default("development"),
    PORT: z.coerce.number().int().positive().optional().default(3000),

    JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),

    DATABASE_URL: z.string().min(1).optional(),
    DB_HOST: z.string().optional(),
    DB_NAME: z.string().optional(),
    DB_USER: z.string().optional(),
    DB_PASS: z.string().optional(),

    BACKUP_DIR: z.string().optional(),
    BACKUP_CRON: z.string().optional(),

    // Optional: let the API proactively keep internal data fresh.
    // Disabled in tests; enabled by default in compose via docker-compose.yml.
    DATA_SCHEDULER_ENABLED: z.string().optional(),
    DATA_PERSIST_ENABLED: z.string().optional(),
    DATA_EOD_POLL_MS: z.coerce.number().int().positive().optional(),
    DATA_EOD_FINAL_SYNC_TIMES: z.string().optional(),
    DATA_EMPLOYEE_DAILY_SYNC_HHMM: z.string().optional(),
    DATA_EMPLOYEE_REFRESH_MS: z.coerce.number().int().positive().optional(),

    CORS_ORIGINS: z.string().optional(),

    ADMIN_USERNAME: z.string().optional(),
    ADMIN_PASSWORD_HASH: z.string().optional(),
    SEED_DEMO_DATA: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    const hasDatabaseUrl = Boolean(val.DATABASE_URL);
    const hasDbParts = Boolean(val.DB_NAME && val.DB_USER && val.DB_PASS);

    if (!hasDatabaseUrl && !hasDbParts) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DATABASE_URL"],
        message: "Provide DATABASE_URL or DB_NAME+DB_USER+DB_PASS",
      });
    }

    if (val.ADMIN_USERNAME && !val.ADMIN_PASSWORD_HASH) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ADMIN_PASSWORD_HASH"],
        message: "ADMIN_PASSWORD_HASH is required when ADMIN_USERNAME is set",
      });
    }
  });

/**
 * Validated environment variables.
 *
 * This module intentionally throws at import-time when required env vars are missing,
 * so misconfiguration fails fast on boot.
 */
const env = envSchema.parse(process.env);

module.exports = env;
