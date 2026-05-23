const { after, beforeEach, mock, test } = require("node:test");
const assert = require("node:assert");
const path = require("path");
const ExcelJS = require("exceljs");

const baseDir = path.resolve(__dirname, "../../");
const EXPORT_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const dataDbMock = {
  fetchEmployeesAll: mock.fn(async () => []),
  insertManualEmployee: mock.fn(async () => null),
  updateManualEmployee: mock.fn(async () => null),
  archiveManualEmployee: mock.fn(async () => null),
};

const rbacMock = {
  getRequestAllowedBranches: mock.fn(() => null),
  ensureBranchAccessForBranchId: mock.fn(() => ({ ok: true })),
  ensureStoreBranchAccess: mock.fn(async () => ({ ok: true })),
};

const dataSourceMock = {
  getBranchNameById: mock.fn((branchId) => `BRANCH-${branchId}`),
};

const metaMock = {
  buildExternalMeta: mock.fn(() => ({ source: "db" })),
};

const mockModules = {
  [path.join(baseDir, "services/dataDb.js")]: dataDbMock,
  [path.join(baseDir, "middleware/rbac.js")]: rbacMock,
  [path.join(baseDir, "services/dataSource.js")]: dataSourceMock,
  [path.join(baseDir, "services/dataGateway/meta.js")]: metaMock,
};

Object.entries(mockModules).forEach(([absPath, exports]) => {
  require.cache[absPath] = {
    id: absPath,
    filename: absPath,
    loaded: true,
    exports,
  };
});

const employeeController = require("../../controllers/employeeController");

function makeReq({ query = {}, body = {}, params = {}, user = { id: 11 } } = {}) {
  return { query, body, params, user };
}

function makeRes() {
  let payload = null;
  let statusCode = 200;

  return {
    status: (code) => {
      statusCode = code;
      return {
        json: (value) => {
          payload = value;
          return value;
        },
      };
    },
    json: (value) => {
      payload = value;
      return value;
    },
    getPayload: () => payload,
    getStatusCode: () => statusCode,
  };
}

function normalizeCellValue(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    if (Array.isArray(value.richText))
      return value.richText.map((part) => part.text || "").join("");
    if (Object.prototype.hasOwnProperty.call(value, "text")) return String(value.text || "");
    if (Object.prototype.hasOwnProperty.call(value, "result"))
      return normalizeCellValue(value.result);
  }
  return String(value);
}

async function readWorkbookFromResponse(payload) {
  const base64 = String(payload?.data?.contentBase64 || "");
  assert.ok(base64, "Expected contentBase64 in export payload");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(base64, "base64"));
  return workbook;
}

beforeEach(() => {
  dataDbMock.fetchEmployeesAll.mock.resetCalls();
  dataDbMock.insertManualEmployee.mock.resetCalls();
  dataDbMock.updateManualEmployee.mock.resetCalls();
  dataDbMock.archiveManualEmployee.mock.resetCalls();
  rbacMock.getRequestAllowedBranches.mock.resetCalls();
  rbacMock.ensureBranchAccessForBranchId.mock.resetCalls();
  rbacMock.ensureStoreBranchAccess.mock.resetCalls();

  dataDbMock.fetchEmployeesAll.mock.mockImplementation(async () => []);
  dataDbMock.insertManualEmployee.mock.mockImplementation(async () => null);
  dataDbMock.updateManualEmployee.mock.mockImplementation(async () => null);
  dataDbMock.archiveManualEmployee.mock.mockImplementation(async () => null);
  rbacMock.getRequestAllowedBranches.mock.mockImplementation(() => null);
  rbacMock.ensureBranchAccessForBranchId.mock.mockImplementation(() => ({ ok: true }));
  rbacMock.ensureStoreBranchAccess.mock.mockImplementation(async () => ({ ok: true }));
});

test("exportEmployees returns filtered XLSX workbook payload", async () => {
  dataDbMock.fetchEmployeesAll.mock.mockImplementation(async () => [
    {
      empid: "2605230001",
      name: "Employee Alpha",
      jobName: "Supervisor",
      branchId: "2",
      branchName: "NORTH HUB",
      storeCode: "302001",
      storeName: "Store Alpha",
      status: "ACTIVE",
    },
    {
      empid: "2605230002",
      name: "Employee Beta",
      jobName: "Cashier",
      branchId: "3",
      branchName: "EAST HUB",
      storeCode: "303001",
      storeName: "Store Beta",
      status: "ACTIVE",
    },
  ]);
  rbacMock.getRequestAllowedBranches.mock.mockImplementation(() => ["2"]);

  const res = makeRes();
  await employeeController.exportEmployees(makeReq({ query: { role: "Supervisor" } }), res);

  assert.strictEqual(res.getStatusCode(), 200);
  const response = res.getPayload();
  assert.strictEqual(response.ok, true);
  assert.ok(String(response.data.fileName).endsWith(".xlsx"));
  assert.strictEqual(response.data.contentType, EXPORT_MIME);

  const workbook = await readWorkbookFromResponse(response);
  const sheet = workbook.getWorksheet("Employees");
  assert.ok(sheet, "Expected Employees worksheet");
  assert.strictEqual(normalizeCellValue(sheet.getRow(5).getCell(1).value), "2605230001");
  assert.strictEqual(normalizeCellValue(sheet.getRow(5).getCell(2).value), "Employee Alpha");
  assert.strictEqual(sheet.rowCount, 5);
});

test("createEmployee validates branch scope and writes manual employee payload", async () => {
  dataDbMock.insertManualEmployee.mock.mockImplementation(async (payload) => ({
    empid: payload.nik,
    name: payload.fullName,
    jobName: payload.role,
    branchId: payload.branchId,
    branchName: "NORTH HUB",
    storeCode: payload.storeCode,
    storeName: payload.storeName,
    status: "ACTIVE",
    source: "manual",
  }));

  const req = makeReq({
    body: {
      nik: "2605230099",
      fullName: "Manual Employee",
      role: "Supervisor",
      branchId: "2",
      storeCode: "302001",
      storeName: "Manual Store",
    },
    user: { id: 44 },
  });
  const res = makeRes();

  await employeeController.createEmployee(req, res);

  assert.strictEqual(res.getStatusCode(), 200);
  assert.strictEqual(res.getPayload().ok, true);
  assert.strictEqual(res.getPayload().data.nik, "2605230099");
  assert.deepStrictEqual(rbacMock.ensureBranchAccessForBranchId.mock.calls[0].arguments.slice(1), [
    "2",
    { failClosed: true },
  ]);
  assert.strictEqual(dataDbMock.insertManualEmployee.mock.calls[0].arguments[1], 44);
});

after(() => {
  Object.keys(mockModules).forEach((absPath) => {
    delete require.cache[absPath];
  });
  delete require.cache[require.resolve("../../controllers/employeeController")];
});
