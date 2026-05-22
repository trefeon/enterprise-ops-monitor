/**
 * Deployment Verification & Diagnostics Script
 * 
 * Verifies all services in the containerized stack:
 * - Docker container health & statuses
 * - Database connectivity & data presence (counts of tables/seeds)
 * - Production API status (3000)
 * - Mock API live fake data serving (4000)
 * - Web app SPA availability (5173)
 * - Container log analyzer for warning/error patterns
 * 
 * Run with: node scripts/deploy-check.js
 */

const { execSync } = require("child_process");
const http = require("http");
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
// Parse arguments to determine mode
const args = process.argv.slice(2);
let mode = null; // 'demo' or 'prod'
args.forEach((arg) => {
  if (arg === "--demo" || arg === "-d" || arg === "--mode=demo") {
    mode = "demo";
  } else if (arg === "--prod" || arg === "-p" || arg === "--mode=prod" || arg === "--mode=full") {
    mode = "prod";
  }
});

// Auto-detect mode if not provided by checking running Docker containers
if (!mode) {
  try {
    const checkPs = execSync("docker ps --format '{{.Names}}'", { encoding: "utf8" });
    if (checkPs.includes("eom-web-demo")) {
      mode = "demo";
    } else {
      mode = "prod";
    }
  } catch (_) {
    mode = "prod";
  }
}

console.log(`${BOLD}${CYAN}=====================================================${RESET}`);
console.log(`${BOLD}${CYAN}   ENTERPRISE OPS MONITOR DEPLOYMENT VALIDATOR       ${RESET}`);
console.log(`${BOLD}${CYAN}   Mode: ${mode === "demo" ? "DEMO (Mock API)" : "PRODUCTION (Full Stack)"} ${RESET}`);
console.log(`${BOLD}${CYAN}=====================================================${RESET}\n`);

// Load environment variables manually
const envPath = path.join(__dirname, "..", ".env");
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

const dbUser = env.DB_USER || "eom_user";
const dbName = env.DB_NAME || "eom_db";

// Helper to make HTTP GET requests
function httpGet(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        resolve({ ok: true, statusCode: res.statusCode, body, headers: res.headers });
      });
    });
    
    req.on("error", (err) => {
      resolve({ ok: false, error: err.message });
    });
    
    // Set a short timeout (3 seconds)
    req.setTimeout(3000, () => {
      req.destroy();
      resolve({ ok: false, error: "Request Timeout" });
    });
  });
}

// Helper to run shell commands safely
function runCmd(cmd) {
  try {
    return { ok: true, stdout: execSync(cmd, { stdio: "pipe", encoding: "utf8" }) };
  } catch (error) {
    return { ok: false, error: error.message, stderr: error.stderr ? error.stderr.toString() : "" };
  }
}

// 1. Check Docker container statuses
async function checkDockerContainers() {
  console.log(`${BOLD}[1/6] Checking Docker Containers...${RESET}`);
  let expectedContainers;
  if (mode === "demo") {
    const checkApi = runCmd("docker ps -a --format '{{.Names}}'");
    if (checkApi.ok && checkApi.stdout.includes("eom-demo-api")) {
      expectedContainers = ["eom-demo-api", "eom-web-demo", "eom-demo-db", "eom-mock-api"];
    } else {
      expectedContainers = ["eom-mock-api", "eom-web-demo"];
    }
  } else {
    expectedContainers = ["eom-api", "eom-web", "eom-db", "eom-autoheal"];
  }
  const results = {};

  const dockerPs = runCmd("docker ps -a --format '{{.Names}}|{{.Status}}'");
  if (!dockerPs.ok) {
    console.log(`${RED}✗ Docker command failed. Is Docker running?${RESET}`);
    return { ok: false, results };
  }

  const lines = dockerPs.stdout.split("\n").filter(Boolean);
  const containerMap = {};
  lines.forEach((line) => {
    const [name, status] = line.split("|");
    containerMap[name] = status;
  });

  expectedContainers.forEach((name) => {
    const status = containerMap[name];
    if (!status) {
      results[name] = { running: false, status: "Missing", health: "unknown" };
      console.log(`  ✗ ${RED}${name}${RESET}: Container is not created.`);
    } else {
      const isUp = status.startsWith("Up");
      let health = "unknown";
      if (status.includes("(healthy)")) health = "healthy";
      else if (status.includes("(unhealthy)")) health = "unhealthy";
      else if (status.includes("(starting)")) health = "starting";

      results[name] = { running: isUp, status, health };
      const healthColor = health === "healthy" ? GREEN : (health === "unhealthy" ? RED : YELLOW);
      const statusColor = isUp ? GREEN : RED;
      console.log(`  ${isUp ? "✓" : "✗"} ${statusColor}${name}${RESET} - Status: ${status} [Health: ${healthColor}${health}${RESET}]`);
    }
  });

  const allRunning = expectedContainers.every(c => results[c]?.running);
  return { ok: allRunning, results };
}

// 2. Check database data and tables
async function checkDatabaseData() {
  console.log(`\n${BOLD}[2/6] Checking Database connectivity & data presence...${RESET}`);
  
  const dbContainer = mode === "demo" ? "eom-demo-db" : "eom-db";
  const actualDbName = dbName;
  // Test connection to postgres container by running a query
  const testConn = runCmd(`docker exec ${dbContainer} pg_isready -U ${dbUser} -d ${actualDbName}`);
  if (!testConn.ok) {
    console.log(`  ✗ ${RED}Connection to eom-db failed.${RESET}`);
    return { ok: false, data: null };
  }

  // Count rows in main tables to verify seeding
  const queries = {
    users: `SELECT COUNT(*) FROM "Users";`,
    roles: `SELECT COUNT(*) FROM "roles";`,
    role_permissions: `SELECT COUNT(*) FROM "role_permissions";`,
    user_roles: `SELECT COUNT(*) FROM "user_roles";`,
    stores: `SELECT COUNT(*) FROM "stores_master";`,
    eod_logs: `SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'EODLogs') AS eod_exists;`
  };

  const dbState = { tables: {}, hasData: false };
  let hasTables = true;

  try {
    // Check if tables exist by querying pg_tables
    const tableCheck = runCmd(`docker exec ${dbContainer} psql -U ${dbUser} -d ${actualDbName} -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"`);
    if (!tableCheck.ok) {
      throw new Error("Failed to list tables.");
    }
    const tableList = tableCheck.stdout.split("\n").map(t => t.trim()).filter(Boolean);
    console.log(`  Found public tables: ${CYAN}${tableList.join(", ")}${RESET}`);

    if (tableList.length === 0) {
      console.log(`  ✗ ${RED}Database is empty (no tables found).${RESET}`);
      return { ok: false, dbState };
    }

    // Get counts
    const checkCount = (tableName) => {
      if (!tableList.some(t => t.toLowerCase() === tableName.toLowerCase())) {
        return -1; // table doesn't exist
      }
      const countRes = runCmd(`docker exec ${dbContainer} psql -U ${dbUser} -d ${actualDbName} -t -c "SELECT COUNT(*) FROM \\"${tableName}\\";"`);
      return countRes.ok ? parseInt(countRes.stdout.trim(), 10) : -2;
    };

    const counts = {
      Users: checkCount("Users"),
      roles: checkCount("roles"),
      role_permissions: checkCount("role_permissions"),
      user_roles: checkCount("user_roles"),
      stores_master: checkCount("stores_master"),
      SyncLogs: checkCount("SyncLogs"),
      afterhours_pc_log: checkCount("afterhours_pc_log")
    };

    let totalDataRows = 0;
    Object.entries(counts).forEach(([table, count]) => {
      if (count === -1) {
        console.log(`  ✗ ${YELLOW}${table}${RESET}: Table does not exist.`);
        hasTables = false;
      } else if (count === -2) {
        console.log(`  ✗ ${RED}${table}${RESET}: Failed to query table.`);
        hasTables = false;
      } else {
        totalDataRows += count;
        const color = count > 0 ? GREEN : YELLOW;
        console.log(`  ✓ ${table}: ${color}${count} rows${RESET}`);
      }
    });

    dbState.hasData = totalDataRows > 0;
    
    if (counts.Users > 0 && counts.roles > 0) {
      console.log(`  ✓ ${GREEN}Database contains seeded RBAC & User data.${RESET}`);
      return { ok: true, hasData: true, dbState };
    } else {
      console.log(`  ⚠ ${YELLOW}Database is unseeded or missing key data.${RESET}`);
      return { ok: true, hasData: false, dbState };
    }
  } catch (err) {
    console.log(`  ✗ ${RED}Database diagnostic failed:${RESET} ${err.message}`);
    return { ok: false, error: err.message };
  }
}

// 3. Check Web App (5173)
async function checkWebApp() {
  console.log(`\n${BOLD}[3/6] Checking Web App (Port 5173)...${RESET}`);
  const res = await httpGet("http://127.0.0.1:5173/");
  if (res.ok) {
    const isHtml = res.body.includes("<html") || res.body.includes("<!DOCTYPE html");
    if (isHtml) {
      console.log(`  ✓ ${GREEN}Web App is active and serving index.html on port 5173${RESET}`);
      return { ok: true };
    } else {
      console.log(`  ⚠ ${YELLOW}Web App is responsive but serving non-HTML content.${RESET}`);
      return { ok: false, error: "Invalid content type" };
    }
  } else {
    console.log(`  ✗ ${RED}Web App is unreachable on port 5173:${RESET} ${res.error}`);
    return { ok: false, error: res.error };
  }
}

// 4. Check Production API (3000)
async function checkProductionApi() {
  console.log(`\n${BOLD}[4/6] Checking Production API (Port 3000)...${RESET}`);
  const res = await httpGet("http://127.0.0.1:3000/");
  if (res.ok) {
    try {
      const data = JSON.parse(res.body);
      if (data.ok && data.data && data.data.message.includes("API is running")) {
        console.log(`  ✓ ${GREEN}Production API is active and healthy on port 3000${RESET}`);
        return { ok: true };
      } else {
        console.log(`  ⚠ ${YELLOW}Production API responded but response envelope did not match:${RESET}`, res.body);
        return { ok: false, error: "Response mismatch" };
      }
    } catch (_) {
      console.log(`  ⚠ ${YELLOW}Production API did not return valid JSON:${RESET}`, res.body.substring(0, 100));
      return { ok: false, error: "Invalid JSON" };
    }
  } else {
    console.log(`  ✗ ${RED}Production API is unreachable on port 3000:${RESET} ${res.error}`);
    return { ok: false, error: res.error };
  }
}

// 5. Check Mock API (4000) serving live fake data
async function checkMockApi() {
  console.log(`\n${BOLD}[5/6] Checking Mock API (Port 4000)...${RESET}`);
  const res = await httpGet("http://127.0.0.1:4000/api/stores");
  if (res.ok) {
    try {
      const data = JSON.parse(res.body);
      if (data.ok && Array.isArray(data.data) && data.data.length > 0) {
        // Inspect a store code to verify it starts with ST- or is numeric
        const firstStore = data.data[0];
        const isSynthetic = firstStore.storeCode && (firstStore.storeCode.startsWith("ST-") || /^\d+$/.test(String(firstStore.storeCode)));
        if (isSynthetic) {
          console.log(`  ✓ ${GREEN}Mock API is serving live fake data with synthetic store codes (e.g., ${firstStore.storeCode})${RESET}`);
          return { ok: true, storeCount: data.data.length };
        } else {
          console.log(`  ⚠ ${YELLOW}Mock API is serving stores but codes are not synthetic (${firstStore.storeCode})${RESET}`);
          return { ok: true, storeCount: data.data.length, warning: "Non-synthetic store codes" };
        }
      } else {
        console.log(`  ✗ ${RED}Mock API responded with invalid envelope or empty data:${RESET}`, res.body.substring(0, 200));
        return { ok: false, error: "Data envelope mismatch" };
      }
    } catch (_) {
      console.log(`  ✗ ${RED}Mock API did not return valid JSON:${RESET}`, res.body.substring(0, 100));
      return { ok: false, error: "Invalid JSON" };
    }
  } else {
    console.log(`  ✗ ${RED}Mock API is unreachable on port 4000:${RESET} ${res.error}`);
    return { ok: false, error: res.error };
  }
}

// 6. Inspect logs of api and web containers for errors and warnings
async function inspectContainerLogs() {
  console.log(`\n${BOLD}[6/6] Scanning Container Logs for warnings & errors...${RESET}`);
  const isDemoDb = mode === "demo" && runCmd("docker ps -a --format '{{.Names}}'").stdout.includes("eom-demo-api");
  const logsToScan = mode === "demo"
    ? (isDemoDb ? ["eom-demo-api", "eom-web-demo", "eom-mock-api"] : ["eom-mock-api", "eom-web-demo"])
    : ["eom-api", "eom-web"];
  const anomalies = [];

  logsToScan.forEach((name) => {
    const cmdRes = runCmd(`docker logs --tail 150 ${name}`);
    if (!cmdRes.ok) {
      console.log(`  ✗ ${RED}Could not fetch logs for ${name}.${RESET}`);
      return;
    }

    const lines = cmdRes.stdout.split("\n");
    let containerAnomalies = 0;
    
    lines.forEach((line, idx) => {
      const lower = line.toLowerCase();
      // Look for critical error identifiers
      const isCritical = lower.includes("error") || lower.includes("exception") || lower.includes("unhandled") || lower.includes("db error") || lower.includes("relation \"") || lower.includes(" 500 ");
      const isWarning = lower.includes("warn") || lower.includes("deprecated") || lower.includes("skipped");
      
      if (isCritical || isWarning) {
        // Filter out expected notices or safe debug/info lines that might match keywords
        if (lower.includes("error_code") || lower.includes("level\":\"info\"") || lower.includes("success")) return;
        
        containerAnomalies++;
        anomalies.push({
          container: name,
          line: idx + 1,
          type: isCritical ? "CRITICAL" : "WARNING",
          content: line.trim()
        });
      }
    });

    console.log(`  Scan of ${name} complete. Found ${containerAnomalies > 0 ? YELLOW : GREEN}${containerAnomalies} warnings/errors${RESET}.`);
  });

  if (anomalies.length > 0) {
    console.log(`\n${BOLD}${YELLOW}Summary of Detected Log Anomalies:${RESET}`);
    anomalies.forEach((a) => {
      const typeColor = a.type === "CRITICAL" ? RED : YELLOW;
      console.log(`  [${a.container}] Line ${a.line} - ${typeColor}${a.type}${RESET}: ${a.content}`);
    });
  } else {
    console.log(`  ✓ ${GREEN}No critical warnings or errors found in logs.${RESET}`);
  }

  return { ok: true, anomalyCount: anomalies.length, anomalies };
}

// Main execution coordinator
async function run() {
  const summary = [];

  const docker = await checkDockerContainers();
  const isDemoDb = mode === "demo" && docker.results["eom-demo-db"] !== undefined;
  const totalExpected = mode === "demo" ? (isDemoDb ? 4 : 2) : 4;
  summary.push({ 
    check: "Docker Containers Running", 
    status: docker.ok ? "PASS" : "FAIL", 
    details: `${Object.values(docker.results).filter(r => r.running).length}/${totalExpected} running` 
  });

  let dbStatus = "FAIL";
  let dbDetails = "Unavailable";
  if (mode === "demo" && !isDemoDb) {
    console.log(`\n[2/6] Skipping Database checks (N/A in standalone Client-only Demo Mode).`);
    dbStatus = "SKIP";
    dbDetails = "N/A (Demo mode)";
  } else if (docker.results["eom-db"]?.running || (isDemoDb && docker.results["eom-demo-db"]?.running)) {
    const db = await checkDatabaseData();
    dbStatus = db.ok ? (db.hasData ? "PASS" : "WARN") : "FAIL";
    dbDetails = db.ok ? (db.hasData ? "Seeded" : "Empty") : "Error";
  } else {
    console.log(`\n[2/6] Skipping Database checks (Database container not running).`);
  }
  summary.push({ check: "Database Connectivity & Data", status: dbStatus, details: dbDetails });

  const web = await checkWebApp();
  summary.push({ check: "Web App (Port 5173)", status: web.ok ? "PASS" : "FAIL", details: web.ok ? "Reachable" : (web.error || "Error") });

  let apiStatus = "FAIL";
  let apiDetails = "Unreachable";
  if (mode === "demo" && !isDemoDb) {
    console.log(`\n[4/6] Skipping Production API checks (N/A in standalone Client-only Demo Mode).`);
    apiStatus = "SKIP";
    apiDetails = "N/A (Demo mode)";
  } else {
    const api = await checkProductionApi();
    apiStatus = api.ok ? "PASS" : "FAIL";
    apiDetails = api.ok ? "Healthy" : (api.error || "Error");
  }
  summary.push({ check: "Production API (Port 3000)", status: apiStatus, details: apiDetails });

  let mockStatus = "FAIL";
  let mockDetails = "Unreachable";
  if (mode === "prod") {
    console.log(`\n[5/6] Skipping Mock API checks (N/A in Production Mode).`);
    mockStatus = "SKIP";
    mockDetails = "N/A (Production mode)";
  } else {
    const mock = await checkMockApi();
    mockStatus = mock.ok ? "PASS" : "FAIL";
    mockDetails = mock.ok ? `${mock.storeCount} stores served` : (mock.error || "Error");
  }
  summary.push({ check: "Mock API (Port 4000)", status: mockStatus, details: mockDetails });

  const logs = await inspectContainerLogs();
  summary.push({ check: "Log Anomaly Scan", status: logs.anomalyCount === 0 ? "PASS" : "WARN", details: `${logs.anomalyCount} anomalies` });

  // Render Final Dashboard Table
  console.log(`\n${BOLD}${CYAN}=====================================================${RESET}`);
  console.log(`${BOLD}${CYAN}                DIAGNOSTIC STATUS SUMMARY            ${RESET}`);
  console.log(`${BOLD}${CYAN}=====================================================${RESET}`);
  console.log(`${BOLD}${"Check".padEnd(35)} | ${"Status".padEnd(8)} | Details${RESET}`);
  console.log(`------------------------------------+----------+----------------------`);
  
  let overallPass = true;
  summary.forEach((s) => {
    let statColor = GREEN;
    if (s.status === "FAIL") {
      statColor = RED;
      overallPass = false;
    } else if (s.status === "WARN") {
      statColor = YELLOW;
    } else if (s.status === "SKIP") {
      statColor = BLUE;
    }
    console.log(`${s.check.padEnd(35)} | ${statColor}${s.status.padEnd(8)}${RESET} | ${s.details}`);
  });
  console.log(`${BOLD}${CYAN}=====================================================${RESET}`);
  
  if (overallPass) {
    console.log(`\n${BOLD}${GREEN}✓ ALL SYSTEMS DEPLOYED AND RUNNING PERFECTLY!${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`\n${BOLD}${RED}✗ DEPLOYMENT HAD FAILURES OR WARNINGS. REVIEW LOGS!${RESET}\n`);
    process.exit(1);
  }
}

run();
