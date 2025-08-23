// services/excelService.js
const fs = require("fs");
const XLSX = require("xlsx");

/**
 * Analyze an Excel file according to a configuration's column-index mappings.
 * - Uses the first worksheet
 * - Skips "top text" by starting at the first row that has enough non-empty columns
 *   (>= maxMappedColumnIndex + 1)
 * - Maps row[columnIndex] -> field for each mapping
 */
function analyzeExcel(filePath, config) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[1];
  const sheet = workbook.Sheets[sheetName];

  // AOA = Array of Arrays (rows)
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  // determine required minimum number of columns based on mappings
  const maxMappedIndex =
    config?.mappings?.reduce(
      (max, m) => Math.max(max, Number(m.columnIndex)),
      -1
    ) ?? -1;
  const minColsNeeded = maxMappedIndex + 1;

  // find start row: first row that has >= minColsNeeded non-empty cells
  let startRow = 0;
  for (let i = 0; i < rows.length; i++) {
    const nonEmptyCount = rows[i].filter((c) => String(c).trim() !== "").length;
    if (nonEmptyCount >= Math.max(1, minColsNeeded)) {
      startRow = i;
      break;
    }
  }

  // build records using mappings
  const records = [];
  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];

    // stop if the row is completely empty
    const allEmpty = !row.some((c) => String(c).trim() !== "");
    if (allEmpty) continue;

    const obj = {};
    for (const m of config.mappings) {
      const idx = Number(m.columnIndex);
      obj[m.field] = row[idx] !== undefined ? String(row[idx]).trim() : "";
    }

    // keep only rows that have at least one mapped field filled
    const hasAnyValue = Object.values(obj).some((v) => v !== "");
    if (hasAnyValue) records.push(obj);
  }

  return records;
}

/** Clean up temp file safely */
function safeUnlink(path) {
  try {
    fs.unlinkSync(path);
  } catch (_) {}
}

module.exports = {
  analyzeExcel,
  safeUnlink,
};
