const { ok, fail } = require("../utils/response");
const dataDb = require("../services/dataDb");
const ExcelJS = require("exceljs");
const { getBranchNameById } = require("../services/dataSource");
const { buildExternalMeta } = require("../services/dataGateway/meta");
const {
  getRequestAllowedBranches,
  ensureBranchAccessForBranchId,
  ensureStoreBranchAccess,
} = require("../middleware/rbac");
const { getPagination, buildPaginationMeta } = require("../utils/pagination");
const { toWibDate } = require("../utils/time");
const excel = require("../utils/excel");

const EMPLOYEE_EXPORT_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const EMPLOYEE_EXPORT_HEADERS = [
  "NIK",
  "Employee Name",
  "Role",
  "Store Code",
  "Store Name",
  "Branch",
  "Status",
];

function normalizeQuery(value) {
  if (!value) return null;
  const q = String(value).trim();
  return q ? q.toLowerCase() : null;
}

function toEmployeeView(row) {
  const nik = row.empid || row.nik || null;
  const fullName = row.name || row.fullName || null;
  const role = row.jobName || row.role || null;
  const branchId = row.branchId != null ? String(row.branchId) : null;
  return {
    id: nik,
    nik,
    empid: nik,
    fullName,
    name: fullName,
    role,
    jobName: role,
    storeCode: row.storeCode || null,
    storeName: row.storeName || null,
    branchId,
    branchName: row.branchName || getBranchNameById(branchId) || branchId,
    status: row.status || "ACTIVE",
    source: row.source || "sync",
  };
}

function normalizeEmployeePayload(body) {
  return {
    nik: body.nik || body.empid || null,
    fullName: body.fullName || body.name || body.full_name || null,
    role: body.role || body.jobName || body.job_name || null,
    branchId: body.branchId || body.branch_id || null,
    branchName: body.branchName || body.branch_name || null,
    storeCode: body.storeCode || body.store_code || null,
    storeName: body.storeName || body.store_name || null,
    status: body.status || null,
  };
}

function getActorId(req) {
  return Number.isFinite(Number(req.user?.id)) ? Number(req.user.id) : null;
}

function filterEmployees(rows, { branchId, role, needle, status, allowedBranches }) {
  let data = rows;

  if (allowedBranches !== null) {
    if (branchId && !allowedBranches.includes(String(branchId))) return [];
    data = data.filter(
      (row) => row.branchId != null && allowedBranches.includes(String(row.branchId))
    );
  }

  if (branchId) data = data.filter((row) => String(row.branchId || "") === String(branchId));
  if (role)
    data = data.filter(
      (row) => String(row.jobName || "").toUpperCase() === String(role).toUpperCase()
    );
  if (status)
    data = data.filter(
      (row) => String(row.status || "ACTIVE").toUpperCase() === String(status).toUpperCase()
    );

  if (needle) {
    data = data.filter((row) => {
      const nik = String(row.empid || "").toLowerCase();
      const name = String(row.name || "").toLowerCase();
      const storeCode = String(row.storeCode || "").toLowerCase();
      const storeName = String(row.storeName || "").toLowerCase();
      return (
        nik.includes(needle) ||
        name.includes(needle) ||
        storeCode.includes(needle) ||
        storeName.includes(needle)
      );
    });
  }

  return data;
}

function buildEmployeesWorkbook({ generatedAt, branchLabel, roleLabel, searchLabel, employees }) {
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
  summarySheet.getCell("A1").value = "Employee Directory Report";
  excel.styleTitleCell(summarySheet.getCell("A1"));
  summarySheet.mergeCells("A2:D2");
  summarySheet.getCell("A2").value =
    `Branch: ${branchLabel} | Role: ${roleLabel} | Search: ${searchLabel}`;
  excel.styleSubtitleCell(summarySheet.getCell("A2"));
  summarySheet.mergeCells("A3:D3");
  summarySheet.getCell("A3").value = `Generated at ${generatedAt} | Export format: XLSX`;
  excel.styleSubtitleCell(summarySheet.getCell("A3"));

  [
    ["Report Date", toWibDate(), "Generated At", generatedAt],
    ["Branch Filter", branchLabel, "Role Filter", roleLabel],
    ["Search Filter", searchLabel, "Total Exported Employees", employees.length],
  ].forEach((pair, idx) => {
    const rowNumber = idx + 4;
    summarySheet.getCell(`A${rowNumber}`).value = pair[0];
    summarySheet.getCell(`B${rowNumber}`).value = pair[1];
    summarySheet.getCell(`C${rowNumber}`).value = pair[2];
    summarySheet.getCell(`D${rowNumber}`).value = pair[3];
    excel.styleSummaryLabel(summarySheet.getCell(`A${rowNumber}`));
    excel.styleSummaryValue(summarySheet.getCell(`B${rowNumber}`));
    excel.styleSummaryLabel(summarySheet.getCell(`C${rowNumber}`));
    excel.styleSummaryValue(summarySheet.getCell(`D${rowNumber}`));
  });

  const sheet = workbook.addWorksheet("Employees", {
    properties: { defaultRowHeight: 20 },
    views: [{ state: "frozen", ySplit: 4, activeCell: "A5" }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.columns = [
    { width: 18 },
    { width: 34 },
    { width: 24 },
    { width: 14 },
    { width: 34 },
    { width: 24 },
    { width: 12 },
  ];
  sheet.mergeCells("A1:G1");
  sheet.getCell("A1").value = "Employee Directory";
  excel.styleTitleCell(sheet.getCell("A1"));
  sheet.mergeCells("A2:G2");
  sheet.getCell("A2").value =
    `Branch: ${branchLabel} | Role: ${roleLabel} | Search: ${searchLabel}`;
  excel.styleSubtitleCell(sheet.getCell("A2"));
  sheet.mergeCells("A3:G3");
  sheet.getCell("A3").value =
    "Columns: NIK, Employee Name, Role, Store Code, Store Name, Branch, Status.";
  excel.styleSubtitleCell(sheet.getCell("A3"));
  const headerRow = sheet.getRow(4);
  headerRow.values = EMPLOYEE_EXPORT_HEADERS;
  headerRow.eachCell((cell) => excel.styleTableHeader(cell));
  sheet.autoFilter = "A4:G4";

  if (employees.length === 0) {
    sheet.mergeCells("A5:G5");
    const emptyCell = sheet.getCell("A5");
    emptyCell.value = "No employee data for this filter.";
    emptyCell.alignment = { horizontal: "center", vertical: "middle" };
    emptyCell.font = { name: "Arial", italic: true, color: { argb: "64748B" } };
    emptyCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
    excel.setThinBorder(emptyCell);
    return workbook;
  }

  employees.forEach((employee, index) => {
    const dataRow = sheet.addRow([
      employee.nik || "—",
      employee.fullName || "—",
      employee.role || "—",
      employee.storeCode || "—",
      employee.storeName || "—",
      employee.branchName || employee.branchId || "—",
      employee.status || "ACTIVE",
    ]);
    dataRow.eachCell((cell, colNumber) => {
      excel.styleTableCell(cell, {
        center: colNumber === 1 || colNumber === 4 || colNumber === 7,
        wrap: colNumber >= 2,
        alt: index % 2 === 1,
      });
    });
  });

  return workbook;
}

exports.getEmployees = async (req, res) => {
  try {
    const query = req.query.query || req.query.q || req.query.search || null;
    const branchId = req.query.branchId || req.query.branch || null;
    const role = req.query.role || null;
    const status = req.query.status || "ACTIVE";
    const needle = normalizeQuery(query);
    const allowedBranches = getRequestAllowedBranches(req);
    const { page, pageSize } = getPagination(req.query, {
      page: 1,
      pageSize: 20,
      maxPageSize: 200,
    });

    const rows = (await dataDb.fetchEmployeesAll({ includeInactive: status === "INACTIVE" })) || [];

    let data = filterEmployees(rows, { branchId, role, needle, status, allowedBranches }).map(
      toEmployeeView
    );
    data.sort((a, b) => String(a.nik || "").localeCompare(String(b.nik || "")));
    const total = data.length;
    data = data.slice((page - 1) * pageSize, page * pageSize);

    const now = new Date().toISOString();
    return ok(res, data, {
      ...buildExternalMeta({ source: "db", sourceFetchedAt: now, partial: false, warnings: [] }),
      ...buildPaginationMeta({ page, pageSize, total }),
      branchId: branchId ? String(branchId) : null,
      query: needle || null,
      timezone: "Asia/Jakarta",
    });
  } catch (error) {
    console.error("Employees List Error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Internal Server Error");
  }
};

exports.createEmployee = async (req, res) => {
  try {
    const payload = normalizeEmployeePayload(req.body);
    const scopeCheck = ensureBranchAccessForBranchId(req, payload.branchId, { failClosed: true });
    if (!scopeCheck.ok) {
      return fail(res, scopeCheck.status, scopeCheck.code, scopeCheck.message, scopeCheck.details);
    }

    const created = await dataDb.insertManualEmployee(payload, getActorId(req));
    if (!created) return fail(res, 409, "CONFLICT", "Employee NIK already exists");
    return ok(res, toEmployeeView(created), { timezone: "Asia/Jakarta" });
  } catch (error) {
    console.error("Create Employee Error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Failed to create employee");
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const rows = (await dataDb.fetchEmployeesAll({ includeInactive: true })) || [];
    const existing = rows.find((row) => String(row.empid) === String(req.params.nik));
    if (!existing) return fail(res, 404, "NOT_FOUND", "Employee not found");

    const payload = normalizeEmployeePayload(req.body);
    const branchToCheck = payload.branchId || existing.branchId;
    const scopeCheck = ensureBranchAccessForBranchId(req, branchToCheck, { failClosed: true });
    if (!scopeCheck.ok) {
      return fail(res, scopeCheck.status, scopeCheck.code, scopeCheck.message, scopeCheck.details);
    }

    const updated = await dataDb.updateManualEmployee(
      String(req.params.nik),
      payload,
      getActorId(req)
    );
    if (!updated) return fail(res, 404, "NOT_FOUND", "Employee not found");
    return ok(res, toEmployeeView(updated), { timezone: "Asia/Jakarta" });
  } catch (error) {
    console.error("Update Employee Error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Failed to update employee");
  }
};

exports.archiveEmployee = async (req, res) => {
  try {
    const rows = (await dataDb.fetchEmployeesAll({ includeInactive: true })) || [];
    const existing = rows.find((row) => String(row.empid) === String(req.params.nik));
    if (!existing) return fail(res, 404, "NOT_FOUND", "Employee not found");

    const scopeCheck = ensureBranchAccessForBranchId(req, existing.branchId, { failClosed: true });
    if (!scopeCheck.ok) {
      return fail(res, scopeCheck.status, scopeCheck.code, scopeCheck.message, scopeCheck.details);
    }

    const archived = await dataDb.archiveManualEmployee(String(req.params.nik), getActorId(req));
    return ok(res, toEmployeeView(archived), { timezone: "Asia/Jakarta" });
  } catch (error) {
    console.error("Archive Employee Error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Failed to archive employee");
  }
};

exports.exportEmployees = async (req, res) => {
  try {
    const query = req.query.query || req.query.q || req.query.search || null;
    const branchId = req.query.branchId || req.query.branch || null;
    const role = req.query.role || null;
    const status = req.query.status || "ACTIVE";
    const needle = normalizeQuery(query);
    const allowedBranches = getRequestAllowedBranches(req);
    const rows = (await dataDb.fetchEmployeesAll({ includeInactive: status === "INACTIVE" })) || [];
    const employees = filterEmployees(rows, { branchId, role, needle, status, allowedBranches })
      .map(toEmployeeView)
      .sort((a, b) => String(a.nik || "").localeCompare(String(b.nik || "")));
    const generatedAt = excel.formatExportDateTime(new Date());
    const workbook = buildEmployeesWorkbook({
      generatedAt,
      branchLabel: branchId
        ? getBranchNameById(String(branchId)) || String(branchId)
        : "All Branches",
      roleLabel: excel.formatLabel(role, "All Roles"),
      searchLabel: excel.formatLabel(query, "All"),
      employees,
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const contentBase64 = Buffer.isBuffer(buffer)
      ? buffer.toString("base64")
      : Buffer.from(buffer).toString("base64");
    return ok(res, {
      fileName: `employee_directory_${toWibDate()}.xlsx`,
      contentType: EMPLOYEE_EXPORT_MIME,
      contentBase64,
    });
  } catch (error) {
    console.error("Employee Export Error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Failed to export employees");
  }
};

exports.getRoles = async (req, res) => {
  try {
    const allowedBranches = getRequestAllowedBranches(req);
    const rows = (await dataDb.fetchEmployeesAll()) || [];
    const roles = new Set();
    for (const row of rows) {
      if (
        allowedBranches !== null &&
        (row.branchId == null || !allowedBranches.includes(String(row.branchId)))
      ) {
        continue;
      }
      if (row.jobName) roles.add(row.jobName);
    }
    const sortedRoles = Array.from(roles).sort();
    return ok(res, sortedRoles);
  } catch (error) {
    console.error("Get Roles Error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Failed to fetch roles");
  }
};

exports.getEmployeesByStore = async (req, res) => {
  try {
    const { storeCode } = req.query;
    if (!storeCode) return fail(res, 400, "BAD_REQUEST", "storeCode is required");

    const scopeCheck = await ensureStoreBranchAccess(req, storeCode, { failClosed: true });
    if (!scopeCheck.ok) {
      return fail(res, scopeCheck.status, scopeCheck.code, scopeCheck.message, scopeCheck.details);
    }

    const rows = (await dataDb.fetchEmployeesAll()) || [];
    const target = String(storeCode);

    const data = rows
      .filter((row) => String(row.storeCode) === target)
      .map((row) => ({
        empid: row.empid,
        name: row.name,
        jobName: row.jobName,
        storeCode: row.storeCode,
        storeName: row.storeName,
        branchId: row.branchId,
        branchName: row.branchName || getBranchNameById(row.branchId) || row.branchId,
      }));

    return ok(res, data, {
      storeCode: target,
      total: data.length,
      ...buildExternalMeta({
        source: "db",
        sourceFetchedAt: new Date().toISOString(),
        partial: false,
        warnings: [],
      }),
      timezone: "Asia/Jakarta",
    });
  } catch (error) {
    console.error("Employees By Store Error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Internal Server Error");
  }
};
