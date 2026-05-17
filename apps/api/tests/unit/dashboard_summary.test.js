const { mock, test, after } = require("node:test");
const assert = require("node:assert");
const path = require("path");

// Mock `models` module
const modelsMock = {
  SystemLog: { count: mock.fn(async () => 0) },
  BackupLog: { count: mock.fn(async () => 0) },
  SyncAlertState: { count: mock.fn(async () => 0) },
  Op: { gte: Symbol("gte"), in: Symbol("in") },
  sequelize: { query: mock.fn() },
  Sequelize: { QueryTypes: { SELECT: "SELECT" } },
};
// We need to put it into cache before requiring controller
const modelsPath = path.resolve(__dirname, "../../models/index.js");
require.cache[modelsPath] = {
  id: modelsPath,
  filename: modelsPath,
  loaded: true,
  exports: modelsMock,
};

// Mock `dataDb` service
const dataDbMock = {
  fetchEodCurrent: mock.fn(async () => []),
  fetchEmployeesAll: mock.fn(async () => []),
  fetchStoresCount: mock.fn(async () => 0),
};
const dataDbPath = path.resolve(__dirname, "../../services/dataDb.js");
require.cache[dataDbPath] = {
  id: dataDbPath,
  filename: dataDbPath,
  loaded: true,
  exports: dataDbMock,
};

// Mock `authzService`
const authzMock = {
  getAllowedBranches: mock.fn(() => null),
};
const authzPath = path.resolve(__dirname, "../../services/authzService.js");
require.cache[authzPath] = {
  id: authzPath,
  filename: authzPath,
  loaded: true,
  exports: authzMock,
};

// Now require controller
const dashboardController = require("../../controllers/dashboardController");

test("getDashboardSummary calls dataDb once (optimized)", async () => {
  const req = { authz: {} };
  const res = {
    status: () => res,
    json: () => res,
  };

  await dashboardController.getDashboardSummary(req, res);

  const fetchEodCalls = dataDbMock.fetchEodCurrent.mock.calls.length;
  const fetchEmpCalls = dataDbMock.fetchEmployeesAll.mock.calls.length;

  // Assert optimized behavior (1 call each)
  assert.strictEqual(fetchEodCalls, 1, "Should be called once after optimization");
  assert.strictEqual(fetchEmpCalls, 1, "Should be called once after optimization");
});

after(() => {
  delete require.cache[modelsPath];
  delete require.cache[dataDbPath];
  delete require.cache[authzPath];
  delete require.cache[require.resolve("../../controllers/dashboardController")];
});
