const { after, beforeEach, mock, test } = require("node:test");
const assert = require("node:assert");
const path = require("path");
const ExcelJS = require("exceljs");

const baseDir = path.resolve(__dirname, "../../");
const EXPORT_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const opOr = Symbol("or");
const opILike = Symbol("iLike");

const mockSystemLog = {
  count: mock.fn(async () => 0),
  findAll: mock.fn(async () => []),
  create: mock.fn(async () => ({})),
};

const mockDb = {
  SystemLog: mockSystemLog,
  sequelize: {
    authenticate: mock.fn(async () => {}),
    query: mock.fn(async () => [[], []]),
  },
  Sequelize: {
    Op: {
      or: opOr,
      iLike: opILike,
    },
  },
};

const mockModules = {
  [path.join(baseDir, "models/index.js")]: mockDb,
  [path.join(baseDir, "utils/serviceHeartbeats.js")]: {
    upsertServiceHeartbeat: mock.fn(async () => {}),
    getServiceHeartbeat: mock.fn(async () => null),
    heartbeatStatus: mock.fn(() => ({ status: "UNKNOWN", lastSeenAt: null })),
  },
  [path.join(baseDir, "services/dataClient.js")]: {
    BRANCHES: [],
  },
};

Object.entries(mockModules).forEach(([absPath, exports]) => {
  require.cache[absPath] = {
    id: absPath,
    filename: absPath,
    loaded: true,
    exports,
  };
});

const systemController = require("../../controllers/systemController");

function makeReq(query = {}) {
  return {
    query,
    user: { username: "tester" },
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

async function readWorkbookFromPayload(payload) {
  const base64 = String(payload?.data?.contentBase64 || "");
  assert.ok(base64, "Expected export payload contentBase64");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(base64, "base64"));
  return workbook;
}

beforeEach(() => {
  mockSystemLog.count.mock.resetCalls();
  mockSystemLog.findAll.mock.resetCalls();
  mockSystemLog.create.mock.resetCalls();

  mockSystemLog.count.mock.mockImplementation(async () => 0);
  mockSystemLog.findAll.mock.mockImplementation(async () => []);
  mockSystemLog.create.mock.mockImplementation(async () => ({}));
});

test("exportSystemLogs returns styled workbook with log rows", async () => {
  mockSystemLog.findAll.mock.mockImplementation(async () => [
    {
      id: 10,
      level: "ERROR",
      component: "API",
      message: "Database timeout",
      metadata: { requestId: "abc-123" },
      createdAt: new Date("2026-04-23T04:10:00.000Z"),
    },
  ]);

  const req = makeReq({ level: "ERROR", q: "database" });
  const res = makeRes();

  await systemController.exportSystemLogs(req, res);

  assert.strictEqual(res.getStatusCode(), 200);
  const payload = res.getPayload();
  assert.strictEqual(payload.ok, true);
  assert.strictEqual(payload.data.contentType, EXPORT_MIME);
  assert.match(String(payload.data.fileName || ""), /\.xlsx$/);

  const workbook = await readWorkbookFromPayload(payload);
  const summarySheet = workbook.getWorksheet("Summary");
  const logsSheet = workbook.getWorksheet("Logs");

  assert.ok(summarySheet, "Expected Summary worksheet");
  assert.ok(logsSheet, "Expected Logs worksheet");
  assert.strictEqual(normalizeCellValue(summarySheet.getCell("A1").value), "System Logs Report");
  assert.strictEqual(normalizeCellValue(logsSheet.getCell("A1").value), "System Logs");
  assert.strictEqual(normalizeCellValue(logsSheet.getCell("C5").value), "ERROR");
  assert.strictEqual(normalizeCellValue(logsSheet.getCell("D5").value), "API");
  assert.strictEqual(normalizeCellValue(logsSheet.getCell("E5").value), "Database timeout");
});

test("exportSystemLogs returns empty-state row when no logs", async () => {
  const req = makeReq({ level: "INFO", q: "not-found" });
  const res = makeRes();

  await systemController.exportSystemLogs(req, res);

  assert.strictEqual(res.getStatusCode(), 200);
  const payload = res.getPayload();
  assert.strictEqual(payload.ok, true);

  const workbook = await readWorkbookFromPayload(payload);
  const logsSheet = workbook.getWorksheet("Logs");
  assert.strictEqual(
    normalizeCellValue(logsSheet.getCell("A5").value),
    "No log data for this filter."
  );
});

test("exportSystemLogs applies query filters and caps export limit", async () => {
  const req = makeReq({ level: "WARNING", q: "scheduler", limit: "12000" });
  const res = makeRes();

  await systemController.exportSystemLogs(req, res);

  assert.strictEqual(res.getStatusCode(), 200);
  const findAllOptions = mockSystemLog.findAll.mock.calls[0].arguments[0];

  assert.strictEqual(findAllOptions.limit, 10000);
  assert.strictEqual(findAllOptions.where.level, "WARNING");
  assert.ok(Array.isArray(findAllOptions.where[opOr]));
  assert.strictEqual(findAllOptions.where[opOr].length, 3);

  const firstFilter = findAllOptions.where[opOr][0];
  assert.strictEqual(firstFilter.component[opILike], "%scheduler%");
});

after(() => {
  Object.keys(mockModules).forEach((absPath) => {
    delete require.cache[absPath];
  });
  delete require.cache[require.resolve("../../controllers/systemController")];
});
