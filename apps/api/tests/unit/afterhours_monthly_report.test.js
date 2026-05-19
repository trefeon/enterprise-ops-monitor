const test = require("node:test");
const assert = require("node:assert/strict");

const {
  resolveReportRange,
  resolveViolationWindow,
  resolveMonthlyReportDate,
  generateMonthlyReport,
} = require("../../services/afterhoursReportService");

test("resolveReportRange returns previous month for a March UTC date", () => {
  // March 1 UTC → should report February
  const ref = new Date(Date.UTC(2026, 2, 1, 1, 0, 0)); // 2026-03-01 01:00 UTC
  const result = resolveReportRange(ref);
  assert.equal(result.reportMonth, "2026-02-01");
  assert.equal(result.startDate, "2026-02-01");
  assert.equal(result.endDate, "2026-02-28");
});

test("resolveReportRange handles January (wraps to previous year December)", () => {
  const ref = new Date(Date.UTC(2026, 0, 15, 10, 0, 0)); // 2026-01-15 UTC
  const result = resolveReportRange(ref);
  assert.equal(result.reportMonth, "2025-12-01");
  assert.equal(result.startDate, "2025-12-01");
  assert.equal(result.endDate, "2025-12-31");
});

test("resolveReportRange handles leap year February", () => {
  // March 2024 UTC → February 2024 (leap year, 29 days)
  const ref = new Date(Date.UTC(2024, 2, 1, 1, 0, 0)); // 2024-03-01 UTC
  const result = resolveReportRange(ref);
  assert.equal(result.reportMonth, "2024-02-01");
  assert.equal(result.startDate, "2024-02-01");
  assert.equal(result.endDate, "2024-02-29");
});

test("resolveReportRange handles mid-month reference", () => {
  // Mid-July UTC → should report June
  const ref = new Date(Date.UTC(2026, 6, 15, 12, 0, 0)); // 2026-07-15 UTC
  const result = resolveReportRange(ref);
  assert.equal(result.reportMonth, "2026-06-01");
  assert.equal(result.startDate, "2026-06-01");
  assert.equal(result.endDate, "2026-06-30");
});

test("resolveReportRange uses WIB month at 01:00 on the first", () => {
  const ref = new Date("2026-03-31T18:00:00Z"); // 2026-04-01 01:00 WIB
  const result = resolveReportRange(ref);
  assert.equal(result.reportMonth, "2026-03-01");
  assert.equal(result.startDate, "2026-03-01");
  assert.equal(result.endDate, "2026-03-31");
});

test("resolveViolationWindow starts counting only from 23:15 WIB", () => {
  const window = resolveViolationWindow();
  assert.equal(window.afterhoursWindowStart, "23:15:00");
  assert.equal(window.afterhoursWindowEndExclusive, "01:00:00");
});

test("resolveMonthlyReportDate shifts midnight final checks to the previous day", () => {
  assert.equal(resolveMonthlyReportDate("2026-04-01T00:00:15+07:00", "2026-04-01"), "2026-03-31");
  assert.equal(resolveMonthlyReportDate("2026-03-31T23:45:00+07:00", "2026-03-31"), "2026-03-31");
});

test("generateMonthlyReport uses default window start when warning schedule config is absent", async () => {
  const queryLog = [];
  const sequelize = {
    query: async (sql, options = {}) => {
      queryLog.push({ sql, bind: options.bind || [] });

      return [[], null];
    },
  };

  const result = await generateMonthlyReport(sequelize, { targetMonth: "2026-03" });

  assert.equal(result.reportWindowStart, "23:15");
  assert.equal(result.reportWindowEndExclusive, "01:00");
  assert.equal(result.totalStores, 0);
  assert.equal(
    queryLog.some((entry) => entry.sql.includes("FROM afterhours_pc_log")),
    true
  );
});

test("generateMonthlyReport uses default window start when warning schedule config is malformed", async () => {
  const queryLog = [];
  const sequelize = {
    query: async (sql, options = {}) => {
      queryLog.push({ sql, bind: options.bind || [] });

      if (sql.includes("FROM afterhours_config")) {
        return [
          [
            {
              key: "warning_schedule_times",
              value: '["25:99","invalid"]',
            },
          ],
        ];
      }

      return [[], null];
    },
  };

  const result = await generateMonthlyReport(sequelize, { targetMonth: "2026-03" });

  assert.equal(result.reportWindowStart, "23:15");
  assert.equal(result.reportWindowEndExclusive, "01:00");
  assert.equal(
    queryLog.some(
      (entry) => entry.sql.includes("FROM afterhours_pc_log") && entry.bind[2] === "23:15:00"
    ),
    true
  );
});

test("generateMonthlyReport defaults window start from the relaxed warning schedule", async () => {
  const queryLog = [];
  const sequelize = {
    query: async (sql, options = {}) => {
      queryLog.push({ sql, bind: options.bind || [] });

      if (sql.includes("FROM afterhours_config")) {
        return [
          [
            {
              key: "warning_schedule_times",
              value: '["23:10","23:25","23:40","23:55"]',
            },
            { key: "first_warning_time", value: "23:10" },
            { key: "final_warning_time", value: "23:55" },
          ],
        ];
      }

      if (sql.includes("FROM afterhours_pc_log")) {
        const allRows = [
          {
            store_code: "3042000",
            store_name: "EARLY-1",
            branch_id: "2",
            branch_name: "NORTH HUB",
            check_date: "2026-03-30",
            detected_at: "2026-03-30T23:15:20+07:00",
          },
          {
            store_code: "3042001",
            store_name: "LATE-1",
            branch_id: "2",
            branch_name: "NORTH HUB",
            check_date: "2026-03-31",
            detected_at: "2026-03-31T23:55:20+07:00",
          },
          {
            store_code: "3042002",
            store_name: "MIDNIGHT-1",
            branch_id: "2",
            branch_name: "NORTH HUB",
            check_date: "2026-04-01",
            detected_at: "2026-04-01T00:00:20+07:00",
          },
        ];

        const startTime = String(options.bind?.[2] || "");
        const endTime = String(options.bind?.[3] || "");
        const inWindow = (row) => {
          const time = String(row.detected_at || "").slice(11, 19);
          return time >= startTime || time < endTime;
        };

        return [[...allRows.filter(inWindow)]];
      }

      return [[], null];
    },
  };

  const result = await generateMonthlyReport(sequelize, { targetMonth: "2026-03" });

  assert.equal(result.reportMonth, "2026-03-01");
  assert.equal(result.reportWindowStart, "23:10");
  assert.equal(result.totalStores, 3);
  assert.equal(result.totalViolationDays, 3);

  const insertCalls = queryLog.filter((entry) =>
    entry.sql.includes("INSERT INTO afterhours_monthly_report")
  );
  assert.equal(insertCalls.length, 3);
  assert.equal(
    insertCalls.every((entry) => entry.bind[1] === "23:10"),
    true
  );
  assert.equal(
    insertCalls.every((entry) => entry.bind[2] === "01:00"),
    true
  );
});

test("generateMonthlyReport honors an explicit windowStart override", async () => {
  const sequelize = {
    query: async (sql, options = {}) => {
      if (sql.includes("FROM afterhours_pc_log")) {
        const allRows = [
          {
            store_code: "3041000",
            store_name: "EARLY",
            branch_id: "2",
            branch_name: "NORTH HUB",
            check_date: "2026-03-30",
            detected_at: "2026-03-30T23:30:20+07:00",
          },
          {
            store_code: "3041001",
            store_name: "ALPHA",
            branch_id: "2",
            branch_name: "NORTH HUB",
            check_date: "2026-03-31",
            detected_at: "2026-03-31T23:45:20+07:00",
          },
          {
            store_code: "3041002",
            store_name: "BETA",
            branch_id: "2",
            branch_name: "NORTH HUB",
            check_date: "2026-04-01",
            detected_at: "2026-04-01T00:00:20+07:00",
          },
        ];

        const startTime = String(options.bind?.[2] || "");
        const endTime = String(options.bind?.[3] || "");
        const inWindow = (row) => {
          const time = String(row.detected_at || "").slice(11, 19);
          return time >= startTime || time < endTime;
        };

        return [[...allRows.filter(inWindow)]];
      }

      return [[], null];
    },
  };

  const result = await generateMonthlyReport(sequelize, {
    targetMonth: "2026-03",
    windowStart: "23:30",
  });

  assert.equal(result.reportWindowStart, "23:30");
  assert.equal(result.totalStores, 3);
  assert.equal(result.totalViolationDays, 3);
});

test("generateMonthlyReport preserves blank branch ids instead of nullifying them", async () => {
  const queryLog = [];
  const sequelize = {
    query: async (sql, options = {}) => {
      queryLog.push({ sql, bind: options.bind || [] });

      if (sql.includes("FROM afterhours_config")) {
        return [
          [
            {
              key: "warning_schedule_times",
              value: '["23:15","23:30","23:45","00:00"]',
            },
          ],
        ];
      }

      if (sql.includes("FROM afterhours_pc_log")) {
        return [
          [
            {
              store_code: "3041999",
              store_name: "BAD BRANCH",
              branch_id: "",
              branch_name: "",
              check_date: "2026-03-31",
              detected_at: "2026-03-31T23:45:20+07:00",
            },
          ],
        ];
      }

      return [[], null];
    },
  };

  const result = await generateMonthlyReport(sequelize, { targetMonth: "2026-03" });

  assert.equal(result.totalStores, 1);
  assert.equal(result.totalViolationDays, 1);

  const insertCall = queryLog.find((entry) =>
    entry.sql.includes("INSERT INTO afterhours_monthly_report")
  );
  assert.ok(insertCall);
  assert.equal(insertCall.bind[5], "");
  assert.equal(insertCall.bind[1], "23:15");
  assert.equal(insertCall.bind[2], "01:00");
});
