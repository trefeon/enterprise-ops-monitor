const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isActiveNearCheckTime,
  resolveThresholdMs,
  isFinalViolationStage,
} = require("../../services/afterhoursService");

test("isActiveNearCheckTime accepts recently synced devices", () => {
  const checkAt = new Date("2026-03-04T23:15:00+07:00");
  const thresholdMs = 10 * 60 * 1000;

  assert.equal(isActiveNearCheckTime("2026-03-04T23:14:30+07:00", checkAt, thresholdMs), true);
  assert.equal(isActiveNearCheckTime("2026-03-04T23:05:01+07:00", checkAt, thresholdMs), true);

  assert.equal(isActiveNearCheckTime("2026-03-04T23:04:59+07:00", checkAt, thresholdMs), false);
  assert.equal(isActiveNearCheckTime("2026-03-04T22:50:00+07:00", checkAt, thresholdMs), false);
  assert.equal(isActiveNearCheckTime("2026-03-04T23:16:00+07:00", checkAt, thresholdMs), false);
});

test("isActiveNearCheckTime returns false for null/invalid timestamps", () => {
  const checkAt = new Date("2026-03-04T23:30:00+07:00");
  assert.equal(isActiveNearCheckTime(null, checkAt), false);
  assert.equal(isActiveNearCheckTime("not-a-date", checkAt), false);
});

test("resolveThresholdMs uses initial=10m and final=5m defaults", () => {
  assert.equal(resolveThresholdMs("initial"), 10 * 60 * 1000);
  assert.equal(resolveThresholdMs("final"), 5 * 60 * 1000);
});

test("resolveThresholdMs allows explicit override", () => {
  assert.equal(resolveThresholdMs("initial", 123456), 123456);
  assert.equal(resolveThresholdMs("final", 654321), 654321);
});

test("isFinalViolationStage only accepts the final stage as a violation", () => {
  assert.equal(isFinalViolationStage("initial", 1, 4), false);
  assert.equal(isFinalViolationStage("initial", 3, 4), false);
  assert.equal(isFinalViolationStage("final", 4, 4), true);
  assert.equal(isFinalViolationStage("initial", 4, 4), true);
});
