const { ok, fail } = require("../utils/response");
const { getPagination, buildPaginationMeta } = require("../utils/pagination");
const { toWibDate, toWibIso } = require("../utils/time");
const ExcelJS = require("exceljs");
const dataDb = require("../services/dataDb");
const { getBranchNameById } = require("../services/dataSource");
const { buildExternalMeta } = require("../services/dataGateway/meta");
const { getRequestAllowedBranches, ensureBranchAccessForBranchId } = require("../middleware/rbac");

function toStoreRowFromDb(row, employeeIndex) {
  const branchId = row.branchId || "UNKNOWN";
  const branchName = row.branchName || getBranchNameById(branchId) || branchId;

  // Best-effort PIC lookup from employees table (store-level).
  const picName = row.storeCode ? employeeIndex.get(String(row.storeCode))?.name || null : null;

  return {
    storeId: Number.isFinite(Number(row.storeCode)) ? Number(row.storeCode) : row.storeCode,
    storeCode: row.storeCode,
    storeName: row.storeName,
    areaId: branchId,
    areaName: branchName,
    region: row.regional || null,
    address: null,
    picName,
    phone: null,
    status: "active",
  };
}

const STORE_EXPORT_HEADERS = [
  "Rank",
  "Store Code",
  "Store Name",
  "Branch",
  "Regional Head",
  "Address",
  "PIC Name",
  "Contact Number",
  "Status",
];
const STORE_EXPORT_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function applyStoreFilters(stores, { areaId, region, q, status }) {
  let filtered = stores;

  if (areaId) {
    filtered = filtered.filter((store) => String(store.areaId) === String(areaId));
  }

  if (region) {
    filtered = filtered.filter((store) => String(store.region) === String(region));
  }

  if (q) {
    const needle = String(q).toLowerCase();
    filtered = filtered.filter((store) => {
      const code = String(store.storeCode || "").toLowerCase();
      const name = String(store.storeName || "").toLowerCase();
      return code.includes(needle) || name.includes(needle);
    });
  }

  if (status === "active" || !status) {
    filtered = filtered.filter((store) => store.status === "active");
  }

  return filtered;
}

function formatExportDateTime(value) {
  const iso = toWibIso(value);
  return iso ? iso.replace("T", " ").replace("+07:00", " WIB") : "—";
}

function formatLabel(value, fallback = "All") {
  const raw = String(value ?? "").trim();
  return raw || fallback;
}

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

function buildStoresWorkbook({ scopeLabel, regionLabel, searchLabel, generatedAt, stores }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Enterprise Ops Monitor";
  workbook.lastModifiedBy = "Enterprise Ops Monitor";
  workbook.created = new Date();
  workbook.modified = new Date();

  const summarySheet = workbook.addWorksheet("Summary", {
    properties: { defaultRowHeight: 20 },
    views: [{ state: "frozen", ySplit: 3 }],
  });
  summarySheet.columns = [{ width: 24 }, { width: 42 }, { width: 24 }, { width: 42 }];
  summarySheet.mergeCells("A1:D1");
  summarySheet.getCell("A1").value = "Store Directory Report";
  styleTitleCell(summarySheet.getCell("A1"));
  summarySheet.getRow(1).height = 26;

  summarySheet.mergeCells("A2:D2");
  summarySheet.getCell("A2").value =
    `Branch: ${scopeLabel} | Regional Head: ${regionLabel} | Search: ${searchLabel}`;
  styleSubtitleCell(summarySheet.getCell("A2"));
  summarySheet.getRow(2).height = 24;

  summarySheet.mergeCells("A3:D3");
  summarySheet.getCell("A3").value = `Generated at ${generatedAt} | Export format: XLSX`;
  styleSubtitleCell(summarySheet.getCell("A3"));
  summarySheet.getRow(3).height = 22;

  const summaryPairs = [
    ["Report Date", toWibDate(), "Generated At", generatedAt],
    ["Branch Filter", scopeLabel, "Regional Filter", regionLabel],
    ["Search Filter", searchLabel, "Status Scope", "Active"],
    ["Total Exported Stores", Number(stores.length || 0), "Workbook Sheets", 2],
  ];

  summaryPairs.forEach((pair, idx) => {
    const rowNumber = idx + 4;
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

  const storesSheet = workbook.addWorksheet("Stores", {
    properties: { defaultRowHeight: 20 },
    views: [{ state: "frozen", ySplit: 4, activeCell: "A5" }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  storesSheet.columns = [
    { width: 8 },
    { width: 14 },
    { width: 34 },
    { width: 22 },
    { width: 22 },
    { width: 24 },
    { width: 22 },
    { width: 18 },
    { width: 12 },
  ];

  storesSheet.mergeCells("A1:I1");
  storesSheet.getCell("A1").value = "Store Directory";
  styleTitleCell(storesSheet.getCell("A1"));
  storesSheet.getRow(1).height = 26;

  storesSheet.mergeCells("A2:I2");
  storesSheet.getCell("A2").value =
    `Branch: ${scopeLabel} | Regional Head: ${regionLabel} | Search: ${searchLabel}`;
  styleSubtitleCell(storesSheet.getCell("A2"));
  storesSheet.getRow(2).height = 22;

  storesSheet.mergeCells("A3:I3");
  storesSheet.getCell("A3").value =
    "Columns: Rank, Store Code, Store Name, Branch, Regional Head, Address, PIC Name, Contact Number, Status.";
  styleSubtitleCell(storesSheet.getCell("A3"));
  storesSheet.getRow(3).height = 24;

  const headerRow = storesSheet.getRow(4);
  headerRow.values = STORE_EXPORT_HEADERS;
  headerRow.height = 22;
  headerRow.eachCell((cell) => styleTableHeader(cell));
  storesSheet.autoFilter = "A4:I4";

  if (stores.length === 0) {
    storesSheet.mergeCells("A5:I5");
    const emptyCell = storesSheet.getCell("A5");
    emptyCell.value = "No store data for this filter.";
    emptyCell.alignment = { horizontal: "center", vertical: "middle" };
    emptyCell.font = { name: "Arial", italic: true, color: { argb: "64748B" } };
    emptyCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
    setThinBorder(emptyCell);
    storesSheet.getRow(5).height = 24;
    return workbook;
  }

  stores.forEach((store, index) => {
    const dataRow = storesSheet.addRow([
      index + 1,
      store.storeCode || "—",
      store.storeName || "—",
      store.areaName || "—",
      store.region || "—",
      store.address || "—",
      store.picName || "—",
      store.phone || "—",
      String(store.status || "active")
        .trim()
        .replace(/^\w/, (c) => c.toUpperCase()),
    ]);

    const isAlt = index % 2 === 1;
    dataRow.height = 22;

    dataRow.eachCell((cell, colNumber) => {
      const center = colNumber === 1 || colNumber === 2 || colNumber === 8 || colNumber === 9;
      const wrap = colNumber >= 3 && colNumber <= 7;
      styleTableCell(cell, { center, wrap, alt: isAlt });
    });
  });

  return workbook;
}

function buildStoreExportBase64(buffer) {
  return Buffer.isBuffer(buffer)
    ? buffer.toString("base64")
    : Buffer.from(buffer).toString("base64");
}

exports.getAllStores = async (req, res) => {
  try {
    const { q, status, region } = req.query;
    let areaId = req.query.areaId || req.query.branchId || null;
    const { page, pageSize } = getPagination(req.query, {
      page: 1,
      pageSize: 50,
      maxPageSize: 200,
    });

    // STRICT SCOPE ENFORCEMENT
    const allowedBranches = getRequestAllowedBranches(req);
    if (allowedBranches !== null) {
      // User is restricted.
      // If they requested a specific areaId, ensure it's allowed.
      if (areaId) {
        if (!allowedBranches.includes(String(areaId))) {
          // Requested forbidden branch -> return empty
          return ok(res, [], {
            ...buildPaginationMeta({ page, pageSize, total: 0 }),
            timezone: "Asia/Jakarta",
          });
        }
      } else {
        // No specific area requested -> filter to ALL allowed
        // We will filter `stores` array below.
      }
    }

    const externalMeta = buildExternalMeta({
      source: "db",
      sourceFetchedAt: new Date().toISOString(),
      partial: false,
      warnings: [],
    });

    if (status === "inactive") {
      return ok(res, [], {
        ...buildPaginationMeta({ page, pageSize, total: 0 }),
        ...externalMeta,
        timezone: "Asia/Jakarta",
      });
    }

    const [storeRows, employeeRows] = await Promise.all([
      dataDb.fetchStoresAll(),
      dataDb.fetchEmployeesAll(),
    ]);

    const employeeIndex = new Map();
    for (const emp of employeeRows || []) {
      if (emp?.storeCode) employeeIndex.set(String(emp.storeCode), emp);
    }

    let stores = (storeRows || [])
      .filter((r) => r?.storeCode)
      .map((r) => toStoreRowFromDb(r, employeeIndex));

    // Apply strict scope filter
    if (allowedBranches !== null) {
      stores = stores.filter((store) => {
        const bId = store.areaId;
        return allowedBranches.includes(String(bId));
      });
    }

    stores = applyStoreFilters(stores, { areaId, region, q, status });

    stores.sort((a, b) => String(a.storeCode).localeCompare(String(b.storeCode)));

    const total = stores.length;
    const offset = (page - 1) * pageSize;
    const paged = stores.slice(offset, offset + pageSize);

    return ok(res, paged, {
      ...buildPaginationMeta({ page, pageSize, total }),
      ...externalMeta,
      timezone: "Asia/Jakarta",
    });
  } catch (err) {
    console.error(`[storeController] getAllStores error:`, err);
    return fail(res, 500, "INTERNAL_ERROR", "Internal Server Error");
  }
};

exports.getRegions = async (req, res) => {
  try {
    const storeRows = await dataDb.fetchStoresAll();
    const allowedBranches = getRequestAllowedBranches(req);

    const regions = new Set();
    for (const row of storeRows || []) {
      // Apply strict scope filter to dropdown validation
      if (allowedBranches !== null) {
        if (!row.branchId || !allowedBranches.includes(String(row.branchId))) {
          continue;
        }
      }
      if (row.regional) regions.add(row.regional);
    }
    const sortedRegions = Array.from(regions).sort();
    return ok(res, sortedRegions);
  } catch (err) {
    console.error(`[storeController] getRegions error:`, err);
    return fail(res, 500, "INTERNAL_ERROR", "Failed to fetch regions");
  }
};

exports.getStoreById = async (req, res) => {
  try {
    const storeCode = String(req.params.id);
    const [storeRows, employeeRows] = await Promise.all([
      dataDb.fetchStoresAll(),
      dataDb.fetchEmployeesAll(),
    ]);
    const employeeIndex = new Map();
    for (const emp of employeeRows || []) {
      if (emp?.storeCode) employeeIndex.set(String(emp.storeCode), emp);
    }

    const match = (storeRows || []).find((row) => String(row.storeCode) === storeCode);
    if (!match) return fail(res, 404, "NOT_FOUND", "Store not found");

    const scopeCheck = ensureBranchAccessForBranchId(req, match.branchId, { failClosed: true });
    if (!scopeCheck.ok) {
      return fail(res, scopeCheck.status, scopeCheck.code, scopeCheck.message, scopeCheck.details);
    }

    return ok(res, toStoreRowFromDb(match, employeeIndex), {
      ...buildExternalMeta({
        source: "db",
        sourceFetchedAt: new Date().toISOString(),
        partial: false,
        warnings: [],
      }),
      timezone: "Asia/Jakarta",
    });
  } catch (err) {
    console.error(`[storeController] getStoreById error:`, err);
    return fail(res, 500, "INTERNAL_ERROR", "Server Error");
  }
};

exports.updateStore = async (req, res) => {
  return fail(res, 403, "READ_ONLY", "Store data is read-only (internal data source)");
};

exports.exportStores = async (req, res) => {
  try {
    const { q, status, region } = req.query;
    const areaId = req.query.areaId || req.query.branchId || null;
    const scopeLabel = areaId
      ? getBranchNameById(String(areaId)) || String(areaId)
      : "All Branches";
    const regionLabel = formatLabel(region, "All Regional Heads");
    const searchLabel = formatLabel(q, "All");
    const generatedAt = formatExportDateTime(new Date());

    if (status === "inactive") {
      const workbook = buildStoresWorkbook({
        scopeLabel,
        regionLabel,
        searchLabel,
        generatedAt,
        stores: [],
      });
      const buffer = await workbook.xlsx.writeBuffer();
      return ok(res, {
        fileName: `stores_export_${toWibDate()}.xlsx`,
        contentType: STORE_EXPORT_MIME,
        contentBase64: buildStoreExportBase64(buffer),
      });
    }

    const [storeRows, employeeRows] = await Promise.all([
      dataDb.fetchStoresAll(),
      dataDb.fetchEmployeesAll(),
    ]);

    const employeeIndex = new Map();
    for (const emp of employeeRows || []) {
      if (emp?.storeCode) employeeIndex.set(String(emp.storeCode), emp);
    }

    let stores = (storeRows || [])
      .filter((r) => r?.storeCode)
      .map((r) => toStoreRowFromDb(r, employeeIndex));

    // STRICT SCOPE ENFORCEMENT
    const allowedBranches = getRequestAllowedBranches(req);
    if (allowedBranches !== null) {
      stores = stores.filter((store) => {
        const bId = store.areaId;
        return allowedBranches.includes(String(bId));
      });
      // Also validate requested areaId if present
      if (areaId) {
        if (!allowedBranches.includes(String(areaId))) {
          stores = [];
        }
      }
    }

    stores = applyStoreFilters(stores, { areaId, region, q, status });
    stores.sort((a, b) => String(a.storeCode).localeCompare(String(b.storeCode)));

    const workbook = buildStoresWorkbook({
      scopeLabel,
      regionLabel,
      searchLabel,
      generatedAt,
      stores,
    });
    const buffer = await workbook.xlsx.writeBuffer();

    return ok(res, {
      fileName: `stores_export_${toWibDate()}.xlsx`,
      contentType: STORE_EXPORT_MIME,
      contentBase64: buildStoreExportBase64(buffer),
    });
  } catch (err) {
    console.error(`[storeController] exportStores error:`, err);
    return fail(res, 500, "INTERNAL_ERROR", "Failed to export stores");
  }
};
