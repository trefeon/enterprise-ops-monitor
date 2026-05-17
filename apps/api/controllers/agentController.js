const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const { AgentMonitoring, sequelize, Sequelize } = require("../models");
const { ok, fail } = require("../utils/response");
const { getAllowedBranches } = require("../services/authzService");
const { toWibIso, toWibDate } = require("../utils/time");

const DEFAULT_AGENT_UPDATE_DIR = path.resolve(__dirname, "../../../agent_updates");
const configuredAgentUpdateDir = String(process.env.AGENT_UPDATE_DIR || "").trim();
let AGENT_UPDATE_DIR = configuredAgentUpdateDir || DEFAULT_AGENT_UPDATE_DIR;

function ensureAgentUpdateDirReady(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const versionFilePath = path.join(dirPath, "version.txt");
    if (!fs.existsSync(versionFilePath)) {
      fs.writeFileSync(versionFilePath, "1.0.0");
    }
    return true;
  } catch {
    return false;
  }
}

if (!ensureAgentUpdateDirReady(AGENT_UPDATE_DIR)) {
  if (
    AGENT_UPDATE_DIR !== DEFAULT_AGENT_UPDATE_DIR &&
    ensureAgentUpdateDirReady(DEFAULT_AGENT_UPDATE_DIR)
  ) {
    console.warn(
      `[agentController] AGENT_UPDATE_DIR '${AGENT_UPDATE_DIR}' unavailable; using '${DEFAULT_AGENT_UPDATE_DIR}'`
    );
    AGENT_UPDATE_DIR = DEFAULT_AGENT_UPDATE_DIR;
  } else {
    throw new Error(
      `[agentController] Unable to initialize agent update directory at '${AGENT_UPDATE_DIR}'`
    );
  }
}

const VERSION_FILE = path.join(AGENT_UPDATE_DIR, "version.txt");
const PUBLISHER_FILE = path.join(AGENT_UPDATE_DIR, "DemoAgentPublisher.exe");

let cachedVersionStr = null;
function getCachedVersion() {
  try {
    cachedVersionStr = fs.readFileSync(VERSION_FILE, "utf8").trim();
  } catch {
    if (cachedVersionStr === null) cachedVersionStr = "1.0.0";
  }
  return cachedVersionStr;
}

// Valid agent_status values for validation
const VALID_AGENT_STATUSES = [
  "unknown",
  "checking",
  "online",
  "downloading",
  "updating",
  "up_to_date",
  "error",
  "waiting",
  "need_update",
];

// ─── Download Concurrency Limiter ───
const MAX_CONCURRENT_DOWNLOADS = 10;
let activeDownloads = 0;

/**
 * GET /api/agent/version
 * Returns the current version as plain text for .bat agents.
 * Also logs the agent check-in if query params are provided.
 * Accepts: ?id=STORE_ID&host=HOSTNAME&ver=CURRENT_VER&status=ok|error&msg=MESSAGE
 *          &worker_ver=WORKER_VER&agent_status=checking|downloading|updating|...
 * Returns: VERSION
 */
exports.getAgentVersion = async (req, res) => {
  try {
    const store_id = req.query.id || "";
    const hostname = req.query.host || "";
    const current_ver = req.query.ver || "unknown";
    const status = req.query.status || null;
    const msg = req.query.msg || null;
    const worker_ver = req.query.worker_ver || null;
    const agent_status = req.query.agent_status || null;

    const version = getCachedVersion();

    // Log monitoring check-in
    if (store_id) {
      const upsertData = {
        store_id,
        hostname,
        version: current_ver,
        last_check_at: new Date(),
      };

      if (worker_ver) upsertData.worker_version = worker_ver;

      const isSynced = current_ver === version;

      // Track agent_status if provided and valid
      if (agent_status && VALID_AGENT_STATUSES.includes(agent_status)) {
        upsertData.agent_status = agent_status;
      }

      // Auto-correct status: If already synced, force 'up_to_date'
      // unless it's an explicit 'error' report.
      if (isSynced && status !== "error") {
        if (
          !upsertData.agent_status ||
          upsertData.agent_status === "checking" ||
          upsertData.agent_status === "online"
        ) {
          upsertData.agent_status = "up_to_date";
        }
      } else if (!isSynced && !upsertData.agent_status) {
        upsertData.agent_status = "need_update";
      }

      // Legacy migrator flags are no longer used; clear them on every check-in.
      upsertData.update_requested = false;
      upsertData.script_update_requested = false;

      // Log status/error from agent
      if (status === "ok") {
        upsertData.status_message = msg || "OK";
        upsertData.last_error = null;
      } else if (status === "error") {
        upsertData.status_message = "Error";
        upsertData.last_error = msg || "Unknown error";
        upsertData.agent_status = "error";
      } else {
        upsertData.status_message = "OK";
        upsertData.last_error = null;
      }

      await AgentMonitoring.upsert(upsertData);
    }

    // One-way updater flow: workers compare local version with server version only.
    res.setHeader("Content-Type", "text/plain");
    return res.send(version);
  } catch (err) {
    console.error("Error in getAgentVersion:", err.message);
    return res.status(500).send("Error reading version");
  }
};

/**
 * DELETE /api/agent/monitoring/:store_id
 * Allows admin/super_admin to delete an agent_monitoring row.
 */
exports.deleteAgentData = async (req, res) => {
  try {
    const { store_id } = req.params;
    const roles = req.authz?.roleNames || [];
    if (!roles.includes("admin") && !roles.includes("super_admin")) {
      return fail(res, 403, "FORBIDDEN", "Only admin or super_admin can delete agent records");
    }
    const result = await AgentMonitoring.destroy({ where: { store_id } });
    if (!result) return fail(res, 404, "NOT_FOUND", "Agent record not found");
    return ok(res, { message: "Agent status reset successfully" });
  } catch (err) {
    console.error("Error in deleteAgentData:", err.message);
    return fail(res, 500, "DELETE_ERROR", "Failed to reset agent status");
  }
};

/**
 * GET /api/agent/publisher
 * Downloads the latest DemoAgentPublisher.exe
 * Concurrency limited to MAX_CONCURRENT_DOWNLOADS.
 */
exports.downloadPublisher = async (req, res) => {
  try {
    if (!fs.existsSync(PUBLISHER_FILE)) {
      return res.status(404).send("Publisher file not found");
    }

    // Concurrency check
    if (activeDownloads >= MAX_CONCURRENT_DOWNLOADS) {
      res.setHeader("Retry-After", "30");
      return res.status(503).send("Server busy. Retry after 30 seconds.");
    }

    activeDownloads++;

    // Decrement on finish/close
    let decremented = false;
    const decrement = () => {
      if (!decremented) {
        decremented = true;
        activeDownloads = Math.max(0, activeDownloads - 1);
      }
    };
    res.on("finish", decrement);
    res.on("close", decrement);

    // Tell NGINX not to buffer this response so Node.js experiences actual network backpressure
    // This ensures activeDownloads is accurate and represents actual client download time.
    res.setHeader("X-Accel-Buffering", "no");

    return res.download(PUBLISHER_FILE, "DemoAgentPublisher.exe");
  } catch (err) {
    console.error("Error in downloadPublisher:", err.message);
    return res.status(500).send("Error downloading file");
  }
};

/**
 * POST /api/agent/upload
 * Admin uploads new publisher and sets version
 */
exports.uploadPublisher = async (req, res) => {
  try {
    const { version } = req.body;
    if (!version) return fail(res, 400, "VALIDATION", "Version string is required");
    if (!req.file) return fail(res, 400, "VALIDATION", "No file uploaded");

    // Save version.txt and update cache
    fs.writeFileSync(VERSION_FILE, version);
    cachedVersionStr = version;

    // Multer handles the file saving to PUBLISHER_FILE (via diskStorage)

    return ok(res, { message: "Update deployed successfully", version });
  } catch (err) {
    console.error("Error in uploadPublisher:", err.message);
    return fail(res, 500, "DEPLOY_ERROR", "Deployment failed: " + err.message);
  }
};

/**
 * GET /api/agent/monitoring
 * Gets list of agents enriched with store data from data_stores + data_branches.
 * Supports filtering: ?areaId=X&region=Y&q=search
 * Respects branch scope enforcement.
 */
exports.getMonitoringData = async (req, res) => {
  try {
    const { areaId, region, q } = req.query;

    // Raw SQL JOIN to enrich agent data with store info
    let rows = await sequelize.query(
      `
      SELECT
        am.id,
        s.store_code::text AS store_id,
        am.hostname,
        am.version,
        am.last_check_at,
        am.status_message,
        am.last_error,
        am.update_requested,
        am.script_update_requested,
        am.worker_version,
        am.agent_status,
        s.store_name,
        s.branch_id,
        b.branch_name,
        s.regional
      FROM data_stores s
      LEFT JOIN agent_monitoring am ON s.store_code::text = am.store_id
      LEFT JOIN data_branches b ON b.branch_id = s.branch_id
      ORDER BY am.last_check_at DESC NULLS LAST
      `,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Branch scope enforcement
    const allowedBranches = getAllowedBranches(req.authz);
    if (allowedBranches !== null) {
      rows = rows.filter((r) => {
        const bid = r.branch_id != null ? String(r.branch_id) : null;
        return bid && allowedBranches.includes(bid);
      });
    }

    // Filter by areaId (branch)
    if (areaId) {
      rows = rows.filter((r) => String(r.branch_id) === String(areaId));
    }

    // Filter by regional head
    if (region) {
      rows = rows.filter((r) => String(r.regional) === String(region));
    }

    // Search by store_id or store_name
    if (q) {
      const needle = String(q).toLowerCase();
      rows = rows.filter((r) => {
        const sid = String(r.store_id || "").toLowerCase();
        const sname = String(r.store_name || "").toLowerCase();
        return sid.includes(needle) || sname.includes(needle);
      });
    }

    return ok(res, rows, { activeDownloads });
  } catch (err) {
    console.error("Error in getMonitoringData:", err.message);
    return fail(res, 500, "FETCH_ERROR", "Failed to fetch monitoring data");
  }
};

/**
 * GET /api/agent/suggest-version
 * Returns current version + auto-suggested next version.
 * Supports alphanumeric suffixes (e.g. 1.0.15a -> 1.0.16a).
 */
exports.suggestVersion = (_req, res) => {
  try {
    const current = getCachedVersion();

    // Split by dots, increment the last numeric part
    const parts = current.split(".");
    if (parts.length > 0) {
      const lastPart = parts[parts.length - 1];
      // Check if ends with a letter suffix
      const match = lastPart.match(/^(\d+)([a-zA-Z]*)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        const suffix = match[2];
        parts[parts.length - 1] = num + 1 + suffix;
      }
    }

    return ok(res, { current, suggested: parts.join(".") });
  } catch {
    return ok(res, { current: "1.0.0", suggested: "1.0.1" });
  }
};

/**
 * GET /api/agent/setup-script
 * Dynamically generates Setup_Agent_Update.bat with the correct SERVER_URL
 * based on the request origin (auto-detect domain).
 */
exports.downloadSetupScript = (req, res) => {
  const scriptPath = path.join(AGENT_UPDATE_DIR, "Setup_Agent_Update.bat");
  if (!fs.existsSync(scriptPath)) {
    return res.status(404).send("Setup script template not found");
  }

  // Derive server URL from request headers
  const proto = req.get("x-forwarded-proto") || req.protocol || "https";
  const host = req.get("x-forwarded-host") || req.get("host") || "";
  const serverUrl = `${proto}://${host}`;

  // Read template and inject the correct SERVER_URL
  let script = fs.readFileSync(scriptPath, "utf8");
  script = script.replace(/set "SERVER_URL=.*"/, `set "SERVER_URL=${serverUrl}"`);

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", "attachment; filename=Setup_Agent_Update.bat");
  return res.send(script);
};

// ─── Excel Export Helpers (matching EOD report style) ───

const AGENT_EXPORT_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function setThinBorder(cell) {
  cell.border = {
    top: { style: "thin", color: { argb: "D1D5DB" } },
    left: { style: "thin", color: { argb: "D1D5DB" } },
    bottom: { style: "thin", color: { argb: "D1D5DB" } },
    right: { style: "thin", color: { argb: "D1D5DB" } },
  };
}

function styleTitleCell(cell) {
  cell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1E293B" } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
}

function styleSubtitleCell(cell) {
  cell.font = { name: "Arial", size: 11, italic: true, color: { argb: "475569" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
}

function styleSummaryLabel(cell) {
  cell.font = { name: "Arial", bold: true, color: { argb: "334155" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
  cell.alignment = { vertical: "middle" };
  setThinBorder(cell);
}

function styleSummaryValue(cell) {
  cell.font = { name: "Arial", color: { argb: "0F172A" } };
  cell.alignment = { vertical: "middle", wrapText: true };
  setThinBorder(cell);
}

function styleTableHeader(cell) {
  cell.font = { name: "Arial", bold: true, color: { argb: "FFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "111827" } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  setThinBorder(cell);
}

function styleTableCell(cell, { center = false, wrap = false, alt = false } = {}) {
  cell.font = { name: "Arial", size: 10, color: { argb: "0F172A" } };
  cell.alignment = { vertical: "top", horizontal: center ? "center" : "left", wrapText: wrap };
  cell.fill = alt
    ? { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } }
    : { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF" } };
  setThinBorder(cell);
}

function styleChecklistHeader(cell) {
  cell.font = { name: "Arial", bold: true, color: { argb: "FFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "065F46" } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  setThinBorder(cell);
}

function styleChecklistCell(cell, { alt = false } = {}) {
  cell.font = { name: "Arial", size: 10, color: { argb: "065F46" } };
  cell.alignment = { vertical: "top", horizontal: "center", wrapText: true };
  cell.fill = alt
    ? { type: "pattern", pattern: "solid", fgColor: { argb: "ECFDF5" } }
    : { type: "pattern", pattern: "solid", fgColor: { argb: "F0FDF4" } };
  setThinBorder(cell);
}

function formatExportDateTime(value) {
  const iso = toWibIso(value);
  return iso ? iso.replace("T", " ").replace("+07:00", " WIB") : "—";
}

function deriveStatusLabel(row, currentVersion) {
  if (!row.last_check_at) return "Not Installed";
  const s = row.agent_status;
  if (s && s !== "unknown") {
    if (s === "up_to_date") return "Up to Date";
    if (s === "need_update") return "Need Update";
    if (s === "error") return "Error";
    if (s === "waiting") return "Waiting";
    if (s === "checking") return "Checking";
    if (s === "downloading") return "Downloading";
    if (s === "updating") return "Updating";
  }
  if (row.last_error) return "Error";
  if (row.version === currentVersion) return "Up to Date";
  return "Need Update";
}

/**
 * GET /api/agent/monitoring/export
 * Generates Excel report of agent monitoring data.
 * Grouped by branch (all branches), with checklist columns.
 */
exports.exportAgentReport = async (req, res) => {
  try {
    // Fetch all stores with agent data (same query as getMonitoringData but no filters)
    let rows = await sequelize.query(
      `
      SELECT
        am.id,
        s.store_code::text AS store_id,
        am.hostname,
        am.version,
        am.last_check_at,
        am.status_message,
        am.last_error,
        am.update_requested,
        am.script_update_requested,
        am.worker_version,
        am.agent_status,
        s.store_name,
        s.branch_id,
        b.branch_name,
        s.regional
      FROM data_stores s
      LEFT JOIN agent_monitoring am ON s.store_code::text = am.store_id
      LEFT JOIN data_branches b ON b.branch_id = s.branch_id
      ORDER BY b.branch_name ASC, s.store_code ASC
      `,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Branch scope enforcement
    const allowedBranches = getAllowedBranches(req.authz);
    if (allowedBranches !== null) {
      rows = rows.filter((r) => {
        const bid = r.branch_id != null ? String(r.branch_id) : null;
        return bid && allowedBranches.includes(bid);
      });
    }

    const currentVersion = getCachedVersion();
    const generatedAt = formatExportDateTime(new Date());

    // Compute stats
    const installedAgents = rows.filter((r) => r.last_check_at);
    const syncedCount = installedAgents.filter((r) => r.version === currentVersion).length;
    const outdatedCount = installedAgents.length - syncedCount;
    const v4Workers = installedAgents.filter(
      (r) => r.worker_version && parseInt(r.worker_version, 10) >= 4
    ).length;
    const legacyWorkers = installedAgents.length - v4Workers;
    const errorCount = installedAgents.filter(
      (r) => r.agent_status === "error" || r.last_error
    ).length;

    // Branch summary
    const branchMap = new Map();
    for (const row of rows) {
      const bid = row.branch_name || "UNKNOWN";
      if (!branchMap.has(bid)) {
        branchMap.set(bid, {
          branchName: bid,
          total: 0,
          installed: 0,
          synced: 0,
          outdated: 0,
          notInstalled: 0,
          errors: 0,
          v4: 0,
          legacy: 0,
        });
      }
      const b = branchMap.get(bid);
      b.total++;
      if (row.last_check_at) {
        b.installed++;
        if (row.version === currentVersion) b.synced++;
        else b.outdated++;
        if (row.agent_status === "error" || row.last_error) b.errors++;
        if (row.worker_version && parseInt(row.worker_version, 10) >= 4) b.v4++;
        else b.legacy++;
      } else {
        b.notInstalled++;
      }
    }
    const branchRows = Array.from(branchMap.values()).sort((a, b) =>
      a.branchName.localeCompare(b.branchName)
    );

    // ═══ Build Workbook ═══
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Enterprise Ops Monitor";
    workbook.lastModifiedBy = "Enterprise Ops Monitor";
    workbook.created = new Date();
    workbook.modified = new Date();

    // ── Sheet 1: Summary ──
    const summarySheet = workbook.addWorksheet("Summary", {
      properties: { defaultRowHeight: 20 },
      views: [{ state: "frozen", ySplit: 3 }],
    });
    summarySheet.columns = [{ width: 28 }, { width: 38 }, { width: 28 }, { width: 38 }];

    summarySheet.mergeCells("A1:D1");
    summarySheet.getCell("A1").value = "Agent Updater Report";
    styleTitleCell(summarySheet.getCell("A1"));
    summarySheet.getRow(1).height = 26;

    summarySheet.mergeCells("A2:D2");
    summarySheet.getCell("A2").value = `DemoAgentPublisher Agent Monitoring — All Branches`;
    styleSubtitleCell(summarySheet.getCell("A2"));
    summarySheet.getRow(2).height = 24;

    summarySheet.mergeCells("A3:D3");
    summarySheet.getCell("A3").value = `Generated at ${generatedAt} | Export format: XLSX`;
    styleSubtitleCell(summarySheet.getCell("A3"));
    summarySheet.getRow(3).height = 22;

    const summaryPairs = [
      ["Deployed Version", currentVersion || "None", "Generated At", generatedAt],
      ["Total Stores", rows.length, "Installed Agents", installedAgents.length],
      ["Synced (Up to Date)", syncedCount, "Outdated", outdatedCount],
      [
        "Sync Rate",
        installedAgents.length > 0
          ? `${Math.round((syncedCount / installedAgents.length) * 100)}%`
          : "N/A",
        "Errors",
        errorCount,
      ],
      ["V4 Workers", v4Workers, "Legacy Workers", legacyWorkers],
      ["Branches", branchRows.length, "Not Installed", rows.length - installedAgents.length],
    ];

    summaryPairs.forEach((pair, idx) => {
      const rowNumber = idx + 5;
      summarySheet.getCell(`A${rowNumber}`).value = pair[0];
      summarySheet.getCell(`B${rowNumber}`).value = pair[1];
      summarySheet.getCell(`C${rowNumber}`).value = pair[2];
      summarySheet.getCell(`D${rowNumber}`).value = pair[3];
      styleSummaryLabel(summarySheet.getCell(`A${rowNumber}`));
      styleSummaryValue(summarySheet.getCell(`B${rowNumber}`));
      styleSummaryLabel(summarySheet.getCell(`C${rowNumber}`));
      styleSummaryValue(summarySheet.getCell(`D${rowNumber}`));
      summarySheet.getRow(rowNumber).height = 22;
    });

    // ── Sheet 2: Branch Summary ──
    const branchSheet = workbook.addWorksheet("Branch Summary", {
      properties: { defaultRowHeight: 20 },
      views: [{ state: "frozen", ySplit: 4 }],
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    branchSheet.columns = [
      { width: 6 }, // Rank
      { width: 22 }, // Branch
      { width: 10 }, // Total
      { width: 12 }, // Installed
      { width: 12 }, // Synced
      { width: 12 }, // Outdated
      { width: 14 }, // Not Installed
      { width: 10 }, // Errors
      { width: 10 }, // V3
      { width: 10 }, // Legacy
      { width: 14 }, // Sync Rate
    ];

    branchSheet.mergeCells("A1:K1");
    branchSheet.getCell("A1").value = "Agent Status by Branch";
    styleTitleCell(branchSheet.getCell("A1"));
    branchSheet.getRow(1).height = 26;

    branchSheet.mergeCells("A2:K2");
    branchSheet.getCell("A2").value =
      `Version: ${currentVersion} | Total Stores: ${rows.length} | Installed: ${installedAgents.length}`;
    styleSubtitleCell(branchSheet.getCell("A2"));
    branchSheet.getRow(2).height = 22;

    branchSheet.mergeCells("A3:K3");
    branchSheet.getCell("A3").value = "Overview of agent deployment health per branch/cabang.";
    styleSubtitleCell(branchSheet.getCell("A3"));
    branchSheet.getRow(3).height = 24;

    const branchHeader = branchSheet.getRow(4);
    branchHeader.values = [
      "#",
      "Branch",
      "Total",
      "Installed",
      "Synced",
      "Outdated",
      "Not Installed",
      "Errors",
      "V4",
      "Legacy",
      "Sync Rate",
    ];
    branchHeader.height = 22;
    branchHeader.eachCell((cell) => styleTableHeader(cell));
    branchSheet.autoFilter = "A4:K4";

    branchRows.forEach((row, index) => {
      const dataRow = branchSheet.addRow([
        index + 1,
        row.branchName,
        row.total,
        row.installed,
        row.synced,
        row.outdated,
        row.notInstalled,
        row.errors,
        row.v4,
        row.legacy,
        row.installed > 0 ? row.synced / row.installed : 0,
      ]);

      const isAlt = index % 2 === 1;
      dataRow.height = 22;
      dataRow.getCell(11).numFmt = "0.00%";

      dataRow.eachCell((cell, colNumber) => {
        const center = colNumber !== 2;
        const wrap = colNumber === 2;
        styleTableCell(cell, { center, wrap, alt: isAlt });
      });
    });

    // ── Sheet 3: Stores (per branch, with checklist) ──
    const storesSheet = workbook.addWorksheet("Stores", {
      properties: { defaultRowHeight: 20 },
      views: [{ state: "frozen", ySplit: 4, activeCell: "A5" }],
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    storesSheet.columns = [
      { width: 6 }, // #
      { width: 14 }, // Store Code
      { width: 32 }, // Store Name
      { width: 18 }, // Branch
      { width: 14 }, // Publisher Ver
      { width: 10 }, // Worker Ver
      { width: 14 }, // Status
      { width: 22 }, // Last Check-in
      { width: 30 }, // Error
      { width: 14 }, // ✓ Verified
      { width: 16 }, // ✓ Action Taken
      { width: 30 }, // ✓ Notes
    ];

    storesSheet.mergeCells("A1:L1");
    storesSheet.getCell("A1").value = "Agent Updater — Store Detail Report";
    styleTitleCell(storesSheet.getCell("A1"));
    storesSheet.getRow(1).height = 26;

    storesSheet.mergeCells("A2:L2");
    storesSheet.getCell("A2").value =
      `Version: ${currentVersion} | All Branches | ${rows.length} Stores | ${generatedAt}`;
    styleSubtitleCell(storesSheet.getCell("A2"));
    storesSheet.getRow(2).height = 22;

    storesSheet.mergeCells("A3:L3");
    storesSheet.getCell("A3").value =
      "Green columns (Verified, Action Taken, Notes) are for manual checklist — use dropdown or type freely.";
    styleSubtitleCell(storesSheet.getCell("A3"));
    storesSheet.getRow(3).height = 24;

    const storeHeader = storesSheet.getRow(4);
    storeHeader.values = [
      "#",
      "Store Code",
      "Store Name",
      "Branch",
      "Publisher",
      "Worker",
      "Status",
      "Last Check-in",
      "Error / Message",
      "✓ Verified",
      "✓ Action Taken",
      "✓ Notes",
    ];
    storeHeader.height = 22;
    storeHeader.eachCell((cell, colNumber) => {
      if (colNumber >= 10) {
        styleChecklistHeader(cell);
      } else {
        styleTableHeader(cell);
      }
    });
    storesSheet.autoFilter = "A4:L4";

    rows.forEach((row, index) => {
      const statusLabel = deriveStatusLabel(row, currentVersion);
      const workerNum = parseInt(row.worker_version, 10);
      const workerLabel =
        !row.worker_version || isNaN(workerNum) || workerNum < 4
          ? "legacy"
          : `v${row.worker_version}`;
      const lastCheckIn = row.last_check_at ? formatExportDateTime(row.last_check_at) : "—";
      const errorMsg = row.last_error || row.status_message || "—";

      const dataRow = storesSheet.addRow([
        index + 1,
        row.store_id || "—",
        row.store_name || "—",
        row.branch_name || "—",
        row.version || "—",
        workerLabel,
        statusLabel,
        lastCheckIn,
        errorMsg,
        "", // Verified (checklist)
        "", // Action Taken (checklist)
        "", // Notes (checklist)
      ]);

      const isAlt = index % 2 === 1;
      dataRow.height = 22;

      dataRow.eachCell((cell, colNumber) => {
        if (colNumber >= 10) {
          styleChecklistCell(cell, { alt: isAlt });
        } else {
          const center = colNumber === 1 || colNumber === 5 || colNumber === 6 || colNumber === 7;
          const wrap = colNumber === 3 || colNumber === 9;
          styleTableCell(cell, { center, wrap, alt: isAlt });
        }
      });

      // Data validation: Verified dropdown
      const verifiedCell = dataRow.getCell(10);
      verifiedCell.dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"✓ Done,⏳ Pending,✗ Skipped"'],
        showErrorMessage: true,
        errorTitle: "Invalid",
        error: "Pick from dropdown.",
      };

      // Data validation: Action Taken dropdown
      const actionCell = dataRow.getCell(11);
      actionCell.dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"No Action,Reinstalled,Updated Manually,Contacted PIC,Escalated,Other"'],
        showErrorMessage: true,
        errorTitle: "Invalid",
        error: "Pick from dropdown.",
      };
    });

    // Add conditional formatting for status column
    // (ExcelJS conditional formatting for visual cues)
    if (rows.length > 0) {
      const lastDataRow = 4 + rows.length;
      storesSheet.addConditionalFormatting({
        ref: `G5:G${lastDataRow}`,
        rules: [
          {
            type: "containsText",
            operator: "containsText",
            text: "Up to Date",
            style: {
              font: { color: { argb: "065F46" } },
              fill: { type: "pattern", pattern: "solid", bgColor: { argb: "D1FAE5" } },
            },
          },
          {
            type: "containsText",
            operator: "containsText",
            text: "Error",
            style: {
              font: { color: { argb: "991B1B" } },
              fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FEE2E2" } },
            },
          },
          {
            type: "containsText",
            operator: "containsText",
            text: "Need Update",
            style: {
              font: { color: { argb: "92400E" } },
              fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FEF3C7" } },
            },
          },
          {
            type: "containsText",
            operator: "containsText",
            text: "Not Installed",
            style: {
              font: { color: { argb: "6B7280" } },
              fill: { type: "pattern", pattern: "solid", bgColor: { argb: "F3F4F6" } },
            },
          },
        ],
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.isBuffer(buffer)
      ? buffer.toString("base64")
      : Buffer.from(buffer).toString("base64");

    const datePart = toWibDate() || new Date().toISOString().slice(0, 10);
    const fileName = `agent_updater_report_${datePart}.xlsx`;

    return ok(res, {
      fileName,
      contentType: AGENT_EXPORT_MIME,
      contentBase64: base64,
    });
  } catch (err) {
    console.error("Error in exportAgentReport:", err);
    return fail(res, 500, "EXPORT_ERROR", "Failed to export agent report");
  }
};
