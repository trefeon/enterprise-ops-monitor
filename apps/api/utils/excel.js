const { toWibIso } = require("./time");

function setThinBorder(cell) {
  cell.border = {
    top: { style: "thin", color: { argb: "D1D5DB" } },
    left: { style: "thin", color: { argb: "D1D5DB" } },
    bottom: { style: "thin", color: { argb: "D1D5DB" } },
    right: { style: "thin", color: { argb: "D1D5DB" } },
  };
}

function styleTitleCell(cell) {
  cell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1E293B" } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
}

function styleSubtitleCell(cell) {
  cell.font = { name: "Arial", size: 11, italic: true, color: { argb: "475569" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
}

function styleSummaryLabel(cell) {
  cell.font = { name: "Arial", bold: true, color: { argb: "334155" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
  cell.alignment = { vertical: "middle" };
  setThinBorder(cell);
}

function styleSummaryValue(cell) {
  cell.font = { name: "Arial", color: { argb: "0F172A" } };
  cell.alignment = { vertical: "middle", wrapText: true };
  setThinBorder(cell);
}

function styleTableHeader(cell) {
  cell.font = { name: "Arial", bold: true, color: { argb: "FFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "111827" } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  setThinBorder(cell);
}

function styleTableCell(cell, { center = false, wrap = false, alt = false } = {}) {
  cell.font = { name: "Arial", size: 10, color: { argb: "0F172A" } };
  cell.alignment = { vertical: "top", horizontal: center ? "center" : "left", wrapText: wrap };
  cell.fill = alt
    ? { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } }
    : { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF" } };
  setThinBorder(cell);
}

function formatExportDateTime(value) {
  const iso = toWibIso(value);
  return iso ? iso.replace("T", " ").replace("+07:00", " WIB") : "—";
}

function formatLabel(value, fallback = "All") {
  const raw = String(value ?? "").trim();
  return raw || fallback;
}

module.exports = {
  setThinBorder,
  styleTitleCell,
  styleSubtitleCell,
  styleSummaryLabel,
  styleSummaryValue,
  styleTableHeader,
  styleTableCell,
  formatExportDateTime,
  formatLabel,
};
