const { ok, fail } = require("../utils/response");
const { fetchEmployeesAllBranches } = require("../services/dataSource");

function normalizeEmployee(emp) {
  return {
    id: emp.empid || emp.nik || null,
    nik: emp.empid || emp.nik || null,
    fullName: emp.name || null,
    role: emp.jobName || null,
    storeCode: emp.storeCode || null,
    storeName: emp.storeName || null,
    branchId: emp.branchId || null,
    branchName: emp.branchName || null,
    status: "ACTIVE",
    lastActivity: null,
  };
}

function matchesQuery(emp, needle) {
  const nik = String(emp.empid || emp.nik || "").toLowerCase();
  const name = String(emp.name || "").toLowerCase();
  const storeCode = String(emp.storeCode || "").toLowerCase();
  const storeName = String(emp.storeName || "").toLowerCase();
  const branchName = String(emp.branchName || "").toLowerCase();
  if (!nik && !name && !storeCode && !storeName && !branchName) return false;
  return (
    nik === needle ||
    nik.includes(needle) ||
    name.includes(needle) ||
    storeCode.includes(needle) ||
    storeName.includes(needle) ||
    branchName.includes(needle)
  );
}

const { getAllowedBranches } = require("../services/authzService");

exports.listEmployees = async (req, res) => {
  try {
    const pageRaw = req.query.page;
    const pageSizeRaw = req.query.pageSize;
    const page = Math.max(1, parseInt(pageRaw || "1", 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(pageSizeRaw || "20", 10) || 20));

    const query = req.query.query != null ? String(req.query.query) : "";
    const needle = query.trim().toLowerCase();

    const branchIdFilter =
      req.query.branchId != null && String(req.query.branchId).trim() !== ""
        ? String(req.query.branchId).trim()
        : null;

    const roleFilter =
      req.query.role != null && String(req.query.role).trim() !== ""
        ? String(req.query.role).trim().toUpperCase()
        : null;

    const { rows } = await fetchEmployeesAllBranches();
    const allowedBranches = getAllowedBranches(req.authz);

    let filtered = rows;

    // Strict Scope Access Control
    if (allowedBranches !== null) {
      filtered = filtered.filter(
        (emp) => emp.branchId && allowedBranches.includes(String(emp.branchId))
      );
    }

    if (branchIdFilter) {
      // If user requests a specific branch, ensure they have access to it
      if (allowedBranches !== null && !allowedBranches.includes(branchIdFilter)) {
        return ok(res, [], { pagination: { page, pageSize, total: 0 }, timezone: "Asia/Jakarta" });
      }
      filtered = filtered.filter((emp) => String(emp.branchId || "") === branchIdFilter);
    }
    if (roleFilter) {
      filtered = filtered.filter((emp) => {
        const empRole = String(emp.jobName || emp.job_name || emp.role || "")
          .trim()
          .toUpperCase();
        return empRole === roleFilter;
      });
    }
    if (needle) {
      filtered = filtered.filter((emp) => matchesQuery(emp, needle));
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    const data = paged.map(normalizeEmployee);
    return ok(res, data, {
      pagination: { page, pageSize, total },
      timezone: "Asia/Jakarta",
    });
  } catch (error) {
    console.error("Identity List Employees Error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Internal Server Error");
  }
};

exports.checkIdentity = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return fail(res, 400, "BAD_REQUEST", "Query required");

    const { rows } = await fetchEmployeesAllBranches();
    const allowedBranches = getAllowedBranches(req.authz);
    const needle = String(query).trim().toLowerCase();

    let filtered = rows.filter((emp) => matchesQuery(emp, needle));

    // Strict Scope Access Control
    if (allowedBranches !== null) {
      filtered = filtered.filter(
        (emp) => emp.branchId && allowedBranches.includes(String(emp.branchId))
      );
    }

    const data = filtered.map(normalizeEmployee);

    return ok(res, data, { timezone: "Asia/Jakarta" });
  } catch (error) {
    console.error("Identity Check Error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Internal Server Error");
  }
};

exports.getRoles = async (req, res) => {
  try {
    const { rows } = await fetchEmployeesAllBranches();
    const allowedBranches = getAllowedBranches(req.authz);

    const roles = new Set();
    for (const row of rows) {
      // Scope check
      if (allowedBranches !== null) {
        if (!row.branchId || !allowedBranches.includes(String(row.branchId))) {
          continue;
        }
      }

      // jobName or job_name or role field from the internal data API
      const role = row.jobName || row.job_name || row.role;
      if (role) {
        roles.add(String(role).trim().toUpperCase());
      }
    }

    const sortedRoles = Array.from(roles).sort();
    return ok(res, sortedRoles);
  } catch (error) {
    console.error("Identity Get Roles Error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Failed to fetch roles");
  }
};
