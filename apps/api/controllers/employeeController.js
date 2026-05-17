const { ok, fail } = require("../utils/response");
const dataDb = require("../services/dataDb");
const { getBranchNameById } = require("../services/dataSource");
const { buildExternalMeta } = require("../services/dataGateway/meta");
const { getRequestAllowedBranches, ensureStoreBranchAccess } = require("../middleware/rbac");

function normalizeQuery(value) {
  if (!value) return null;
  const q = String(value).trim();
  return q ? q.toLowerCase() : null;
}

exports.getEmployees = async (req, res) => {
  try {
    const query = req.query.query || req.query.q || req.query.search || null;
    const branchId = req.query.branchId || req.query.branch || null;
    const role = req.query.role || null;
    const needle = normalizeQuery(query);
    const allowedBranches = getRequestAllowedBranches(req);

    const rows = (await dataDb.fetchEmployeesAll()) || [];

    let data = rows;
    if (allowedBranches !== null) {
      if (branchId && !allowedBranches.includes(String(branchId))) {
        return ok(res, [], {
          ...buildExternalMeta({
            source: "db",
            sourceFetchedAt: new Date().toISOString(),
            partial: false,
            warnings: [],
          }),
          total: 0,
          branchId: String(branchId),
          query: needle || null,
          timezone: "Asia/Jakarta",
        });
      }

      data = data.filter(
        (row) => row.branchId != null && allowedBranches.includes(String(row.branchId))
      );
    }

    if (branchId) data = data.filter((r) => String(r.branchId || "") === String(branchId));
    if (role) data = data.filter((r) => r.jobName === role);

    if (needle) {
      data = data.filter((r) => {
        const nik = String(r.empid || "").toLowerCase();
        const name = String(r.name || "").toLowerCase();
        const storeCode = String(r.storeCode || "").toLowerCase();
        const storeName = String(r.storeName || "").toLowerCase();
        return (
          nik.includes(needle) ||
          name.includes(needle) ||
          storeCode.includes(needle) ||
          storeName.includes(needle)
        );
      });
    }

    data = data.map((row) => ({
      empid: row.empid,
      name: row.name,
      jobName: row.jobName,
      storeCode: row.storeCode,
      storeName: row.storeName,
      branchId: row.branchId,
      branchName: row.branchName || getBranchNameById(row.branchId) || row.branchId,
    }));

    const now = new Date().toISOString();
    return ok(res, data, {
      ...buildExternalMeta({ source: "db", sourceFetchedAt: now, partial: false, warnings: [] }),
      total: data.length,
      branchId: branchId ? String(branchId) : null,
      query: needle || null,
      timezone: "Asia/Jakarta",
    });
  } catch (error) {
    console.error("Employees List Error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Internal Server Error");
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
