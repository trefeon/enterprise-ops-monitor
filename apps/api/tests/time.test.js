const test = require("node:test");
const assert = require("node:assert/strict");

const { toWibDate, toWibIso } = require("../utils/time");

test("toWibDate returns correct WIB calendar date", () => {
  assert.equal(toWibDate(new Date("2026-01-21T00:00:00+07:00")), "2026-01-21");
  assert.equal(toWibDate(new Date("2026-01-21T00:30:00+07:00")), "2026-01-21");
  assert.equal(toWibDate(new Date("2026-01-20T23:59:59+07:00")), "2026-01-20");
});

test("toWibIso does not shift dates during 00:xx WIB", () => {
  assert.equal(toWibIso(new Date("2026-01-21T00:00:00+07:00")), "2026-01-21T00:00:00+07:00");
  assert.equal(toWibIso(new Date("2026-01-21T00:30:00+07:00")), "2026-01-21T00:30:00+07:00");
  assert.equal(toWibIso(new Date("2026-01-20T23:59:59+07:00")), "2026-01-20T23:59:59+07:00");
});
