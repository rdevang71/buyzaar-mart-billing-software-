export async function pickSpreadsheetFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = () => resolve(input.files?.[0] || null);
    input.click();
  });
}

export async function parseBulkSheet(file) {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rows.map((row) => normalizeRow(row));
}

export function getBulkField(row, keys, fallback = '') {
  for (const key of keys) {
    const k = normalizeKey(key);
    if (Object.prototype.hasOwnProperty.call(row, k) && row[k] !== '') {
      return row[k];
    }
  }
  return fallback;
}

export function toBoolean(value, fallback = false) {
  if (value === '' || value === null || value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  const s = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(s)) return true;
  if (['false', '0', 'no', 'n'].includes(s)) return false;
  return fallback;
}

function normalizeRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row || {})) {
    out[normalizeKey(key)] = value;
  }
  return out;
}

function normalizeKey(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
