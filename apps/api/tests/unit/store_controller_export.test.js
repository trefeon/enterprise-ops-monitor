const { after, beforeEach, mock, test } = require("node:test");
const assert = require("node:assert");
const path = require("path");
const ExcelJS = require("exceljs");

const baseDir = path.resolve(__dirname, "../../");
const STORE_EXPORT_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const dataDbMock = {
  fetchStoresAll: mock.fn(async () => []),
  fetchEmployeesAll: mock.fn(async () => []),
};

const rbacMock = {
  getRequestAllowedBranches: mock.fn(() => null),
  ensureBranchAccessForBranchId: mock.fn(() => ({ ok: true })),
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

const storeController = require("../../controllers/storeController");

function makeReq(query = {}) {
  return {
    query,
  };
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

function seedStores() {
  dataDbMock.fetchStoresAll.mock.mockImplementation(async () => [
    {
      storeCode: "1001",
      storeName: "Store Alpha",
      branchId: "2",
      branchName: "NORTH HUB",
      regional: "RH-A",
    },
    {
      storeCode: "1002",
      storeName: "Store Beta",
      branchId: "2",
      branchName: "NORTH HUB",
      regional: "RH-B",
    },
    {
      storeCode: "1003",
      storeName: "Store Gamma",
      branchId: "3",
      branchName: "EAST HUB",
      regional: "RH-A",
    },
  ]);
  dataDbMock.fetchEmployeesAll.mock.mockImplementation(async () => []);
}

function normalizeCellValue(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text || "").join("");
    }
    if (Object.prototype.hasOwnProperty.call(value, "text")) {
      return String(value.text || "");
    }
    if (Object.prototype.hasOwnProperty.call(value, "result")) {
      return normalizeCellValue(value.result);
    }
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

function extractStoreCodes(storesSheet) {
  const result = [];

  for (let rowNumber = 5; rowNumber <= storesSheet.rowCount; rowNumber += 1) {
    const code = normalizeCellValue(storesSheet.getRow(rowNumber).getCell(2).value).trim();
    if (!code || code === "—") continue;
    result.push(code);
  }

  return result;
}

beforeEach(() => {
  dataDbMock.fetchStoresAll.mock.resetCalls();
  dataDbMock.fetchEmployeesAll.mock.resetCalls();
  rbacMock.getRequestAllowedBranches.mock.resetCalls();
  rbacMock.ensureBranchAccessForBranchId.mock.resetCalls();
  dataSourceMock.getBranchNameById.mock.resetCalls();
  metaMock.buildExternalMeta.mock.resetCalls();

  dataDbMock.fetchStoresAll.mock.mockImplementation(async () => []);
  dataDbMock.fetchEmployeesAll.mock.mockImplementation(async () => []);
  rbacMock.getRequestAllowedBranches.mock.mockImplementation(() => null);
  rbacMock.ensureBranchAccessForBranchId.mock.mockImplementation(() => ({ ok: true }));
  dataSourceMock.getBranchNameById.mock.mockImplementation((branchId) => `BRANCH-${branchId}`);
  metaMock.buildExternalMeta.mock.mockImplementation(() => ({ source: "db" }));
});

test("exportStores applies branch scope and region filter in Excel export", async () => {
  seedStores();
  rbacMock.getRequestAllowedBranches.mock.mockImplementation(() => ["2"]);

  const req = makeReq({ region: "RH-A" });
  const res = makeRes();

  await storeController.exportStores(req, res);

  assert.strictEqual(res.getStatusCode(), 200);
  const response = res.getPayload();
  assert.strictEqual(response.ok, true);
  assert.strictEqual(response.data.contentType, STORE_EXPORT_MIME);

  const workbook = await readWorkbookFromResponse(response);
  const storesSheet = workbook.getWorksheet("Stores");
  assert.ok(storesSheet, "Expected Stores worksheet");

  const storeCodes = extractStoreCodes(storesSheet);
  assert.deepStrictEqual(storeCodes, ["1001"]);
});

test("exportStores accepts branchId alias and filters worksheet rows", async () => {
  seedStores();

  const req = makeReq({ branchId: "3" });
  const res = makeRes();

  await storeController.exportStores(req, res);

  assert.strictEqual(res.getStatusCode(), 200);
  const response = res.getPayload();
  assert.strictEqual(response.ok, true);

  const workbook = await readWorkbookFromResponse(response);
  const storesSheet = workbook.getWorksheet("Stores");
  const storeCodes = extractStoreCodes(storesSheet);

  assert.deepStrictEqual(storeCodes, ["1003"]);
});

test("exportStores returns styled workbook template and empty-state row", async () => {
  const req = makeReq({ status: "inactive" });
  const res = makeRes();

  await storeController.exportStores(req, res);

  assert.strictEqual(res.getStatusCode(), 200);
  const response = res.getPayload();
  assert.strictEqual(response.ok, true);
  assert.ok(String(response.data.fileName || "").endsWith(".xlsx"));
  assert.strictEqual(response.data.contentType, STORE_EXPORT_MIME);

  const workbook = await readWorkbookFromResponse(response);
  const summarySheet = workbook.getWorksheet("Summary");
  const storesSheet = workbook.getWorksheet("Stores");

  assert.ok(summarySheet, "Expected Summary worksheet");
  assert.ok(storesSheet, "Expected Stores worksheet");
  assert.strictEqual(
    normalizeCellValue(summarySheet.getCell("A1").value),
    "Store Directory Report"
  );
  assert.strictEqual(normalizeCellValue(storesSheet.getCell("A1").value), "Store Directory");
  assert.strictEqual(
    normalizeCellValue(storesSheet.getCell("A5").value),
    "No store data for this filter."
  );
});

after(() => {
  Object.keys(mockModules).forEach((absPath) => {
    delete require.cache[absPath];
  });
  delete require.cache[require.resolve("../../controllers/storeController")];
});
