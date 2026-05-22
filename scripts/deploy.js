/**
 * Container Deployment & Orchestration Script
 * 
 * Automates building and launching the containerized stack:
 * - Parses options for Demo (mock API) vs Production (full Postgres + API)
 * - Verifies Docker daemon connectivity
 * - Instantiates and validates .env file configuration
 * - Automatically provisions external database volumes if missing
 * - Runs docker compose with error catching and troubleshooting output
 * - Triggers post-deploy diagnostics check
 * 
 * Usage:
 *   pnpm deploy [--demo | --prod] [--rebuild]
 */

const { spawnSync, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ANSI color codes
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const CYAN = "\x1b[36m";

console.log(`${BOLD}${BLUE}=====================================================${RESET}`);
console.log(`${BOLD}${BLUE}   ENTERPRISE OPS MONITOR CONTAINER DEPLOYER        ${RESET}`);
console.log(`${BOLD}${BLUE}=====================================================${RESET}\n`);

// 1. Parse Arguments
const args = process.argv.slice(2);
let mode = null; // 'demo' or 'prod'
let rebuild = false;

args.forEach((arg) => {
  if (arg === "--demo" || arg === "-d" || arg === "--mode=demo") {
    mode = "demo";
  } else if (arg === "--prod" || arg === "-p" || arg === "--mode=prod" || arg === "--mode=full") {
    mode = "prod";
  } else if (arg === "--rebuild" || arg === "-r") {
    rebuild = true;
  }
});

// Load .env if present
const envPath = path.join(__dirname, "..", ".env");
const envExamplePath = path.join(__dirname, "..", ".env.example");
const env = {};

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const parts = trimmed.split("=");
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
      env[key] = val;
    }
  });
}

// Default mode detection if not specified
if (!mode) {
  if (env.SEED_DEMO_DATA === "true" || env.NODE_ENV === "development") {
    mode = "demo";
    console.log(`${YELLOW}No mode specified. Defaulting to DEMO mode based on .env config.${RESET}`);
  } else {
    mode = "prod";
    console.log(`${CYAN}No mode specified. Defaulting to PRODUCTION mode.${RESET}`);
  }
}

console.log(`Target Mode: ${BOLD}${mode === "demo" ? YELLOW + "DEMO (Mock API)" : GREEN + "PRODUCTION (Full Stack)"}${RESET}`);
console.log(`Force Rebuild: ${BOLD}${rebuild ? GREEN + "YES" : YELLOW + "NO"}${RESET}\n`);

// 2. Validate Docker Daemon
console.log(`${BOLD}[1/5] Checking Docker Environment...${RESET}`);
const dockerCheck = spawnSync("docker", ["info"], { stdio: "ignore" });
if (dockerCheck.status !== 0) {
  console.error(`${RED}✗ Docker daemon is not running or docker command is missing.${RESET}`);
  console.error(`${YELLOW}Please start Docker and try again.${RESET}`);
  process.exit(1);
}
console.log(`  ✓ Docker is running.`);

// Check docker-compose command
let composeCmd = ["docker", "compose"];
const composeCheck = spawnSync("docker", ["compose", "version"], { stdio: "ignore" });
if (composeCheck.status !== 0) {
  const oldComposeCheck = spawnSync("docker-compose", ["version"], { stdio: "ignore" });
  if (oldComposeCheck.status === 0) {
    composeCmd = ["docker-compose"];
    console.log(`  ✓ Using legacy docker-compose command.`);
  } else {
    console.error(`${RED}✗ Docker Compose is not installed.${RESET}`);
    console.error(`${YELLOW}Please install docker-compose (V2 preferred) and try again.${RESET}`);
    process.exit(1);
  }
} else {
  console.log(`  ✓ Docker Compose (V2) is available.`);
}

// 3. Validate Environment Variables (.env)
console.log(`\n${BOLD}[2/5] Validating Environment Configuration...${RESET}`);
if (!fs.existsSync(envPath)) {
  console.log(`  ⚠ ${YELLOW}.env file not found. Copying .env.example...${RESET}`);
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log(`  ✓ Created .env file from .env.example.`);
    console.log(`  ${YELLOW}Please verify/configure DB_PASS and JWT_SECRET in .env!${RESET}`);
  } else {
    console.error(`${RED}✗ .env.example not found in root. Cannot seed environment.${RESET}`);
    process.exit(1);
  }
} else {
  console.log(`  ✓ .env file exists.`);
}

// Re-read env for checks
const freshContent = fs.readFileSync(envPath, "utf8");
const freshEnv = {};
freshContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
    const parts = trimmed.split("=");
    const key = parts[0].trim();
    const val = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
    freshEnv[key] = val;
  }
});

// Production validation checks
if (mode === "prod") {
  const missing = [];
  if (!freshEnv.DB_PASS || freshEnv.DB_PASS.includes("YOUR_") || freshEnv.DB_PASS === "eom_secure_password") {
    missing.push("DB_PASS (must be set to a secure custom password)");
  }
  if (!freshEnv.JWT_SECRET || freshEnv.JWT_SECRET.includes("YOUR_") || freshEnv.JWT_SECRET.length < 16) {
    missing.push("JWT_SECRET (must be at least 16 characters and secure)");
  }

  if (missing.length > 0) {
    console.warn(`\n${YELLOW}⚠ WARNING: Missing or unsafe production variables in .env:${RESET}`);
    missing.forEach(m => console.log(`  - ${m}`));
    console.warn(`${YELLOW}Starting might fail or run in an insecure state. Proceeding...${RESET}\n`);
  } else {
    console.log(`  ✓ Environment variables look valid.`);
  }

  // Verify external postgres volume exists
  console.log(`  Checking external database volume...`);
  try {
    execSync("docker volume inspect eom_postgres_data", { stdio: "ignore" });
    console.log(`  ✓ Volume 'eom_postgres_data' exists.`);
  } catch (_) {
    console.log(`  ⚠ Volume 'eom_postgres_data' not found. Creating it...`);
    try {
      execSync("docker volume create eom_postgres_data", { stdio: "inherit" });
      console.log(`  ✓ Volume 'eom_postgres_data' created successfully.`);
    } catch (volErr) {
      console.error(`${RED}✗ Failed to create Docker volume 'eom_postgres_data':${RESET}`, volErr.message);
      process.exit(1);
    }
  }
} else {
  console.log(`  ✓ Environment validation complete (demo mode requires no database configs).`);
}

// 4. Run Docker Compose
console.log(`\n${BOLD}[3/5] Launching Containers...${RESET}`);

const composeFile = mode === "demo" ? "docker-compose.demo.yml" : "docker-compose.yml";
const opposingFile = mode === "demo" ? "docker-compose.yml" : "docker-compose.demo.yml";

console.log(`  Ensuring no conflicting stacks are running...`);
const downArgs = ["-f", opposingFile, "down"];
console.log(`  Executing: ${composeCmd.join(" ")} ${downArgs.join(" ")}`);
spawnSync(composeCmd[0], [...composeCmd.slice(1), ...downArgs], { stdio: "ignore" });

const composeArgs = ["-f", composeFile, "up", "-d"];

if (rebuild) {
  composeArgs.push("--build");
  composeArgs.push("--force-recreate");
}

console.log(`  Executing: ${BOLD}${composeCmd.join(" ")} ${composeArgs.join(" ")}${RESET}\n`);

const composeProc = spawnSync(composeCmd[0], [...composeCmd.slice(1), ...composeArgs], { stdio: "inherit" });

if (composeProc.status !== 0) {
  console.error(`\n${RED}✗ Docker Compose failed with exit code ${composeProc.status}.${RESET}`);
  console.error(`${YELLOW}Troubleshooting Tips:${RESET}`);
  console.error(`1. Check if ports (3000, 4000, 5173, 5433) are already in use on your host.`);
  console.error(`2. Run 'docker compose -f ${composeFile} logs' to see build/runtime output.`);
  console.error(`3. Run with --rebuild (-r) to discard cached layers and rebuild images from scratch.`);
  process.exit(composeProc.status || 1);
}

console.log(`\n${GREEN}✓ Containers deployed successfully!${RESET}`);

// 5. Wait for Initialization
console.log(`\n${BOLD}[4/5] Waiting for services to initialize...${RESET}`);
// We wait 8 seconds to allow node start/migrations/seeding in containers to progress
let countdown = 8;
const timer = setInterval(() => {
  if (countdown > 0) {
    process.stdout.write(`  Waiting ${countdown}s... \r`);
    countdown--;
  } else {
    clearInterval(timer);
    runVerification();
  }
}, 1000);

// 6. Run post-deploy checks
function runVerification() {
  console.log(`\n${BOLD}[5/5] Running Post-Deployment Diagnostics...${RESET}`);
  
  const checkProc = spawnSync("node", ["scripts/deploy-check.js"], { stdio: "inherit" });
  
  if (checkProc.status === 0) {
    console.log(`\n${BOLD}${GREEN}=====================================================${RESET}`);
    console.log(`${BOLD}${GREEN}      DEPLOYMENT AND VERIFICATION COMPLETED!        ${RESET}`);
    console.log(`${BOLD}${GREEN}=====================================================${RESET}\n`);
    process.exit(0);
  } else {
    console.error(`\n${BOLD}${RED}=====================================================${RESET}`);
    console.error(`${BOLD}${RED}      DIAGNOSTIC CHECKS FAILED!                      ${RESET}`);
    console.error(`${BOLD}${RED}=====================================================${RESET}`);
    console.error(`${YELLOW}Review the errors above and use 'docker compose logs' for detail.${RESET}\n`);
    process.exit(checkProc.status || 1);
  }
}
