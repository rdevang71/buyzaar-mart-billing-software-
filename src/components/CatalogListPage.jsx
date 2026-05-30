'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';

const PAGE_SIZES = [10, 25, 50, 100];
const TEMPLATE_ROW_LIMIT = 5001;
const OPTIONS_SHEET_NAME = 'Options';
const EXCEL_CELL_TEXT_LIMIT = 32767;

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function writeUint16(out, value) {
  out.push(value & 255, (value >>> 8) & 255);
}

function writeUint32(out, value) {
  out.push(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255);
}

function readUint16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32(bytes, offset) {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

async function inflateRaw(data) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Your browser cannot add Excel dropdowns. Please use a Chromium-based browser.');
  }
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipEntries(buffer) {
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder();
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (readUint32(bytes, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Invalid XLSX file');

  const entryCount = readUint16(bytes, eocd + 10);
  let centralOffset = readUint32(bytes, eocd + 16);
  const entries = new Map();

  for (let i = 0; i < entryCount; i++) {
    if (readUint32(bytes, centralOffset) !== 0x02014b50) throw new Error('Invalid XLSX directory');
    const method = readUint16(bytes, centralOffset + 10);
    const compressedSize = readUint32(bytes, centralOffset + 20);
    const fileNameLength = readUint16(bytes, centralOffset + 28);
    const extraLength = readUint16(bytes, centralOffset + 30);
    const commentLength = readUint16(bytes, centralOffset + 32);
    const localOffset = readUint32(bytes, centralOffset + 42);
    const name = decoder.decode(bytes.slice(centralOffset + 46, centralOffset + 46 + fileNameLength));

    const localNameLength = readUint16(bytes, localOffset + 26);
    const localExtraLength = readUint16(bytes, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    let data;
    if (method === 0) data = compressed;
    else if (method === 8) data = await inflateRaw(compressed);
    else throw new Error(`Unsupported XLSX compression method ${method}`);

    entries.set(name, data);
    centralOffset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function writeZipEntries(entries) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const [name, data] of entries.entries()) {
    const nameBytes = encoder.encode(name);
    const checksum = crc32(data);
    const local = [];
    writeUint32(local, 0x04034b50);
    writeUint16(local, 20);
    writeUint16(local, 0);
    writeUint16(local, 0);
    writeUint16(local, 0);
    writeUint16(local, 0);
    writeUint32(local, checksum);
    writeUint32(local, data.length);
    writeUint32(local, data.length);
    writeUint16(local, nameBytes.length);
    writeUint16(local, 0);
    local.push(...nameBytes);
    localParts.push(new Uint8Array(local), data);

    const central = [];
    writeUint32(central, 0x02014b50);
    writeUint16(central, 20);
    writeUint16(central, 20);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint32(central, checksum);
    writeUint32(central, data.length);
    writeUint32(central, data.length);
    writeUint16(central, nameBytes.length);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint32(central, 0);
    writeUint32(central, offset);
    central.push(...nameBytes);
    centralParts.push(new Uint8Array(central));

    offset += local.length + data.length;
  }

  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = [];
  writeUint32(end, 0x06054b50);
  writeUint16(end, 0);
  writeUint16(end, 0);
  writeUint16(end, entries.size);
  writeUint16(end, entries.size);
  writeUint32(end, centralSize);
  writeUint32(end, centralOffset);
  writeUint16(end, 0);

  return new Blob([...localParts, ...centralParts, new Uint8Array(end)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function patchWorksheetValidations(xml, validations) {
  const dataValidations = [
    `<dataValidations count="${validations.length}">`,
    ...validations.map((validation) => (
      `<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="${escapeXml(validation.range)}">` +
      `<formula1>${escapeXml(validation.formula)}</formula1>` +
      '</dataValidation>'
    )),
    '</dataValidations>',
  ].join('');
  const withoutExisting = xml.replace(/<dataValidations[\s\S]*?<\/dataValidations>/, '');
  if (withoutExisting.includes('</sheetData>')) {
    return withoutExisting.replace('</sheetData>', `</sheetData>${dataValidations}`);
  }
  return withoutExisting.replace('</worksheet>', `${dataValidations}</worksheet>`);
}

async function saveWorkbookWithValidations(workbook, fileName, validations) {
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', compression: true });
  const entries = await readZipEntries(buffer);
  const worksheetPath = 'xl/worksheets/sheet1.xml';
  const worksheet = entries.get(worksheetPath);
  if (!worksheet) throw new Error('Template worksheet not found');
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  entries.set(worksheetPath, encoder.encode(patchWorksheetValidations(decoder.decode(worksheet), validations)));

  const url = URL.createObjectURL(writeZipEntries(entries));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function fetchTaxNames() {
  try {
    const res = await fetch('/api/catalog/taxes?pageSize=500');
    const json = await res.json();
    if (!json.success) return [];
    return [...new Set((json.data?.records || [])
      .map((tax) => String(tax.name || '').trim())
      .filter(Boolean))];
  } catch {
    return [];
  }
}

export default function CatalogListPage({
  breadcrumbs = [],
  title = '',
  description = '',
  filters = null,
  createLabel = null,
  onCreateClick,
  bulkOperations = true,
  bulkImportType = null, // 'categories' | 'sub-categories'
  endpoint = '',
  extraQueryParams = null,
  columns = [],
  rows = [],
  loading = false,
  totalLabel = 'Record(s)',
  emptyMessage = 'No Records Found',
  page = 1,
  pageSize = 10,
  totalPages = 1,
  total = 0,
  onPageChange,
  onPageSizeChange,
  search = '',
  onSearchChange,
  showRowActions = false,
  onEdit,
  onDelete,
  showStoreSelector = false,
  selectorLabel = null,
  selectorPlaceholder = 'None',
  stores = [],
  onStoreChange,
  onImportSuccess,
}) {
  const [checkedRows, setCheckedRows]   = useState([]);
  const [allChecked, setAllChecked]     = useState(false);
  const [storeVal, setStoreVal]         = useState('');
  const [bulkOpen, setBulkOpen]         = useState(false);
  const [importing, setImporting]       = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [toast, setToast]               = useState(null);
  const fileRef                         = useRef();

  const isControlled  = !!onPageChange;
  const curPage       = isControlled ? page     : 1;
  const curPageSize   = isControlled ? pageSize : 10;
  const curSearch     = onSearchChange ? search : '';
  const curTotal      = total || rows.length;
  const curTotalPages = totalPages || Math.ceil(rows.length / curPageSize);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSearch = (val) => { if (onSearchChange) onSearchChange(val); };
  const handlePageChange = (p) => { if (onPageChange) onPageChange(p); };
  const handlePageSizeChange = (s) => { if (onPageSizeChange) onPageSizeChange(s); };

  const handleAllCheck = () => {
    if (allChecked) { setCheckedRows([]); setAllChecked(false); }
    else { setCheckedRows(rows.map(r => r.id)); setAllChecked(true); }
  };

  const displayRows = isControlled ? rows : rows
    .filter(r => !curSearch || Object.values(r).some(v =>
      String(v).toLowerCase().includes(curSearch.toLowerCase())
    ))
    .slice((curPage - 1) * curPageSize, curPage * curPageSize);

  const pageButtons = () => {
    if (curTotalPages <= 7) return Array.from({ length: curTotalPages }, (_, i) => i + 1);
    if (curPage <= 4) return [1,2,3,4,5,'…',curTotalPages];
    if (curPage >= curTotalPages - 3) return [1,'…',curTotalPages-4,curTotalPages-3,curTotalPages-2,curTotalPages-1,curTotalPages];
    return [1,'…',curPage-1,curPage,curPage+1,'…',curTotalPages];
  };

  const getTemplateFileName = () => {
    if (bulkImportType === 'products') return 'products-import-template.xlsx';
    return `${bulkImportType || 'import'}-template.xlsx`;
  };

  const fetchTemplateRecords = async () => {
    if (!endpoint) return rows;
    const params = new URLSearchParams({ page: '1', pageSize: String(Math.min(Math.max(total || rows.length || 5000, 5000), 10000)) });
    if (curSearch) params.set('search', curSearch);
    Object.entries(extraQueryParams || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') params.set(key, String(value));
    });
    try {
      const response = await fetch(`${endpoint}?${params.toString()}`);
      const json = await response.json();
      return json.success ? (json.data?.records || []) : rows;
    } catch {
      return rows;
    }
  };

  const getTemplateCellValue = (record, header) => {
    if (!record) return '';
    if (header === 'image_url') return '';
    const direct = record[header];
    let value = '';
    if (direct !== undefined && direct !== null) value = direct;
    else if (header === 'category_name') value = record.category_name || record.category || '';
    else if (header === 'sub_category_name') value = record.sub_category_name || record.subCategory || '';
    else if (header === 'brand_name') value = record.brand_name || record.brand || '';
    else if (header === 'manufacturer_name') value = record.manufacturer_name || record.manufacturer || '';
    else if (header === 'department_name') value = record.department_name || record.department || '';
    else if (header === 'tax_name') value = record.tax_name || record.tax || '';
    else if (header === 'inventory_store_name') value = record.inventory_store_name || record.store_name || '';
    else if (header === 'selling_price') value = record.selling_price ?? String(record.price || '').replace(/[^0-9.]/g, '');
    if (typeof value !== 'string') return value;
    return value.length > EXCEL_CELL_TEXT_LIMIT ? value.slice(0, EXCEL_CELL_TEXT_LIMIT) : value;
  };

  // ── Download template ──────────────────────────────────────
  const downloadTemplate = async () => {
    try {
    const baseHeaders = bulkImportType === 'categories'
      ? ['name', 'description', 'sort_sequence', 'is_active']
      : bulkImportType === 'sub-categories'
        ? ['name', 'category_name', 'description', 'sort_sequence', 'is_active']
      : bulkImportType === 'product-groups'
        ? ['name', 'description', 'category_name', 'is_active']
        : [
            'name',
            'description',
            'barcode',
            'sku',
            'category_name',
            'sub_category_name',
            'brand_name',
            'manufacturer_name',
            'department_name',
            'tax_name',
            'mrp',
            'selling_price',
            'cost_price',
            'unit',
            'is_active',
            'is_service',
            'allow_discount_on_pos',
            'include_tax',
            'image_url',
            'manage_inventory_enabled',
            'inventory_store_name',
            'opening_stock_qty',
            'default_low_stock_value',
            'disable_billing_on_zero',
            'disable_sales_on_expiry',
            'inventory_method',
            'stock_item_type',
          ];

    const headers = [...baseHeaders];
    const requiredHeaders = new Set(bulkImportType === 'products' ? ['name', 'selling_price', 'unit'] : ['name']);
    const requirementRow = headers.map((header) => requiredHeaders.has(header) ? 'Required' : 'Optional');
    const templateRecords = await fetchTemplateRecords();
    const dataRows = templateRecords.map((record) => headers.map((header) => getTemplateCellValue(record, header)));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([requirementRow, headers, ...dataRows]);
    headers.forEach((header, index) => {
      const requirementRef = XLSX.utils.encode_cell({ r: 0, c: index });
      const headerRef = XLSX.utils.encode_cell({ r: 1, c: index });
      if (ws[requirementRef]) {
        ws[requirementRef].s = { font: { bold: true, color: { rgb: requiredHeaders.has(header) ? '9F1239' : '166534' } } };
      }
      if (requiredHeaders.has(header)) {
        ws[headerRef].s = { font: { bold: true, color: { rgb: '9F1239' } } };
      }
    });
    ws['!freeze'] = { xSplit: 0, ySplit: 2 };
    const taxNames = bulkImportType === 'products' ? await fetchTaxNames() : [];
    const includeTaxCol = headers.indexOf('include_tax');
    const taxNameCol = headers.indexOf('tax_name');
    const unitCol = headers.indexOf('unit');
    const inventoryMethodCol = headers.indexOf('inventory_method');
    const stockTypeCol = headers.indexOf('stock_item_type');
    const booleanCols = [
      'is_active',
      'is_service',
      'allow_discount_on_pos',
      'include_tax',
      'manage_inventory_enabled',
      'disable_billing_on_zero',
      'disable_sales_on_expiry',
    ].map((header) => headers.indexOf(header)).filter((index) => index >= 0);
    const validations = [];
    const addValidation = (col, formula) => {
      if (col < 0 || !formula) return;
      validations.push({
        range: `${XLSX.utils.encode_col(col)}3:${XLSX.utils.encode_col(col)}${TEMPLATE_ROW_LIMIT}`,
        formula,
      });
    };
    for (const col of booleanCols) addValidation(col, '"Yes,No"');
    addValidation(unitCol, '"PCS,KG,LTR"');
    if (taxNameCol >= 0 && taxNames.length) {
      addValidation(taxNameCol, `'${OPTIONS_SHEET_NAME}'!$A$2:$A$${taxNames.length + 1}`);
    }
    addValidation(includeTaxCol, '"Yes,No"');
    addValidation(inventoryMethodCol, '"direct,indirect"');
    addValidation(stockTypeCol, '"batched,unbatched"');
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    if (bulkImportType === 'products' && taxNames.length) {
      const options = XLSX.utils.aoa_to_sheet([['tax_name'], ...taxNames.map((name) => [name])]);
      XLSX.utils.book_append_sheet(wb, options, OPTIONS_SHEET_NAME);
      const optionSheet = wb.Workbook?.Sheets?.find((sheet) => sheet.name === OPTIONS_SHEET_NAME);
      if (optionSheet) optionSheet.Hidden = 1;
    }
    if (bulkImportType === 'products') {
      const info = XLSX.utils.aoa_to_sheet([
        ['Field', 'Requirement / allowed values'],
        ['name', 'Required'],
        ['selling_price', 'Required'],
        ['unit', 'Required: PCS, KG, or LTR'],
        ['include_tax', 'Yes/No. Use Yes when GST is already included in selling_price.'],
        ['tax_name', taxNames.length ? 'Choose from dropdown. Required when include_tax is Yes.' : 'Required when include_tax is Yes. Must match an existing GST slab name.'],
        ['stock_item_type', 'batched/unbatched'],
      ]);
      XLSX.utils.book_append_sheet(wb, info, 'Instructions');
    }
    if (validations.length) {
      await saveWorkbookWithValidations(wb, getTemplateFileName(), validations);
    } else {
      XLSX.writeFile(wb, getTemplateFileName());
    }
    setBulkOpen(false);
    } catch (err) {
      console.error('Template download failed:', err);
      showToast('Template download failed', 'error');
    }
  };

  // ── Handle Excel file upload ───────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    fileRef.current.value = '';
    setBulkOpen(false);
    setImporting(true);

    try {
      const data   = await file.arrayBuffer();
      const wb     = XLSX.read(data);
      const ws     = wb.Sheets[wb.SheetNames[0]];
      const previewRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
      const firstRow = (previewRows[0] || []).map((cell) => String(cell).trim().toLowerCase());
      const startsWithRequirementRow = firstRow.some((cell) => cell === 'required' || cell === 'optional');
      const parsed = XLSX.utils.sheet_to_json(ws, { defval: '', range: startsWithRequirementRow ? 1 : 0 });

      if (!parsed.length) {
        showToast('Excel file is empty', 'error');
        setImporting(false);
        return;
      }

      const res  = await fetch('/api/catalog/import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: bulkImportType, rows: parsed }),
      });
      const json = await res.json();

      if (json.success) {
        setImportResult(json.data);
        showToast(`${json.data.inserted} records imported successfully!`);
        onImportSuccess?.();
      } else {
        showToast(json.message || 'Import failed', 'error');
      }
    } catch (err) {
      showToast('Failed to read file', 'error');
    } finally {
      setImporting(false);
    }
  };

  const bulkMenuItems = bulkImportType === 'products'
    ? [
        { label: 'Import Products (Excel)', action: () => fileRef.current?.click() },
        { label: 'Download Template', action: downloadTemplate },
        { label: 'Export Products', action: () => {
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, title);
            XLSX.writeFile(wb, `${title.toLowerCase().replace(' ', '-')}-export.xlsx`);
            setBulkOpen(false);
          }
        },
      ]
    : bulkImportType === 'product-groups'
      ? [
          { label: 'Import Product Groups (Excel)', action: () => fileRef.current?.click() },
          { label: 'Download Template', action: downloadTemplate },
          { label: 'Export Product Groups', action: () => {
              const ws = XLSX.utils.json_to_sheet(rows);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, title);
              XLSX.writeFile(wb, `${title.toLowerCase().replace(' ', '-')}-export.xlsx`);
              setBulkOpen(false);
            }
          },
        ]
    : [
        ...(bulkImportType ? [
          { label: `Create ${title}`,          action: onCreateClick },
          { label: `Import ${title} (Excel)`,  action: () => fileRef.current?.click() },
          { label: `Download Template`,        action: downloadTemplate },
          { label: `Export ${title}`,          action: () => {
              const ws = XLSX.utils.json_to_sheet(rows);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, title);
              XLSX.writeFile(wb, `${title.toLowerCase().replace(' ', '-')}-export.xlsx`);
              setBulkOpen(false);
            }
          },
        ] : [
          { label: `Create ${title}`,   action: onCreateClick },
          { label: `Edit ${title}`,     action: null },
          { label: `Export ${title}`,   action: () => {
              const ws = XLSX.utils.json_to_sheet(rows);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, title);
              XLSX.writeFile(wb, `${title.toLowerCase().replace(' ', '-')}-export.xlsx`);
              setBulkOpen(false);
            }
          },
        ]),
      ];

  const importErrors = Array.isArray(importResult?.errors) ? importResult.errors : [];
  const groupedImportErrors = importErrors.reduce((acc, item) => {
    const message = (item?.error || 'Unknown import error').trim();
    const rowName = (item?.row || '').trim();

    if (!acc[message]) {
      acc[message] = { message, count: 0, samples: [] };
    }

    acc[message].count += 1;
    if (rowName && acc[message].samples.length < 4 && !acc[message].samples.includes(rowName)) {
      acc[message].samples.push(rowName);
    }

    return acc;
  }, {});

  const groupedImportErrorsList = Object.values(groupedImportErrors)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans text-sm text-gray-800">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[999] px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all
          ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.msg}
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload}/>

      {/* Import loading overlay */}
      {importing && (
        <div className="fixed inset-0 z-[998] flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl px-8 py-6 flex items-center gap-3">
            <svg className="animate-spin w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
                strokeDasharray="32" strokeDashoffset="12"/>
            </svg>
            <span className="text-sm font-medium text-gray-700">Importing data...</span>
          </div>
        </div>
      )}

      {/* Import Result Modal */}
      {importResult && (
        <div className="fixed inset-0 z-[998] flex items-center justify-center bg-black/30">
          <div className="w-[min(92vw,560px)] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start gap-3">
              <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full ${importErrors.length ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                <span className="text-base font-bold">{importErrors.length ? '!' : '✓'}</span>
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Import Complete</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {importErrors.length
                    ? 'Some rows could not be imported. Please review the reasons below.'
                    : 'All rows imported successfully.'}
                </p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Imported</p>
                <p className="mt-1 text-lg font-extrabold text-emerald-700">{importResult.inserted}</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Skipped</p>
                <p className="mt-1 text-lg font-extrabold text-amber-700">{importResult.skipped}</p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">Errors</p>
                <p className="mt-1 text-lg font-extrabold text-rose-700">{importErrors.length}</p>
              </div>
            </div>

            {importErrors.length > 0 && (
              <div className="mb-4 space-y-3">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Tip: Fix the listed reasons in your Excel file, then re-upload.
                </div>

                <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {groupedImportErrorsList.map((group, index) => (
                    <div key={`${group.message}-${index}`} className="rounded-lg border border-slate-200 bg-white p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[12px] font-semibold text-slate-800">{group.message}</p>
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 whitespace-nowrap">
                          {group.count} row{group.count > 1 ? 's' : ''}
                        </span>
                      </div>
                      {group.samples.length > 0 && (
                        <p className="mt-1 text-[11px] text-slate-500">
                          Example: {group.samples.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <details className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-700">Show full row-wise error details</summary>
                  <div className="mt-2 max-h-36 space-y-1 overflow-y-auto pr-1">
                    {importErrors.map((e, i) => (
                      <p key={i} className="text-[11px] text-slate-600">
                        <span className="font-semibold text-slate-800">{e.row}:</span> {e.error}
                      </p>
                    ))}
                  </div>
                </details>
              </div>
            )}

            <button
              onClick={() => setImportResult(null)}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-400">›</span>}
            {crumb.href
              ? <Link href={crumb.href} className="text-blue-500 hover:underline">{crumb.label}</Link>
              : <span className="text-gray-700 font-medium">{crumb.label}</span>}
          </span>
        ))}
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="text-xs text-gray-500 mt-1">
              {description.replace('Need Help?', '')}
              {description.includes('Need Help?') && (
                <a href="#" className="text-blue-500 hover:underline">Need Help?</a>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 relative">
          {bulkOperations && (
            <div className="relative">
              <button
                onClick={() => setBulkOpen(o => !o)}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                Bulk Operations
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>

              {bulkOpen && (
                <>
                  {/* Backdrop */}
                  <div className="fixed inset-0 z-40" onClick={() => setBulkOpen(false)}/>
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                    {bulkMenuItems.map((item, i) => (
                      <button key={i}
                        onClick={() => { item.action?.(); if (item.label !== `Import ${title} (Excel)`) setBulkOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        {item.label === `Import ${title} (Excel)` && (
                          <span className="inline-block w-4 h-4 mr-2 text-green-600">↑</span>
                        )}
                        {item.label === 'Download Template' && (
                          <span className="inline-block w-4 h-4 mr-2 text-blue-500">↓</span>
                        )}
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {createLabel && (
            <button onClick={onCreateClick}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
              <span className="text-base leading-none">+</span>
              {createLabel}
            </button>
          )}
        </div>
      </div>

      {filters && (
        <div className="mb-5">
          {filters}
        </div>
      )}

      {/* Store Selector */}
      {showStoreSelector && (
        <div className="mb-5">
          {selectorLabel && (
            <label className="block text-sm font-medium text-gray-700 mb-1">{selectorLabel}</label>
          )}
          <div className="relative inline-block">
            <select value={storeVal}
              onChange={e => { setStoreVal(e.target.value); onStoreChange?.(e.target.value); }}
              className="w-56 appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-8 bg-white text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">{selectorPlaceholder}</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
          </div>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex justify-end px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 20 20">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M15 15l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input type="text" placeholder="Search" value={curSearch}
              onChange={e => handleSearch(e.target.value)}
              className="pl-8 pr-3 py-2 w-60 border border-gray-200 rounded-lg text-sm bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"/>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={allChecked} onChange={handleAllCheck}
                    className="w-4 h-4 accent-blue-600 cursor-pointer rounded"/>
                </th>
                {columns.map(col => (
                  <th key={col.key} className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                    {col.label}
                    {col.sortable !== false && (
                      <span className="ml-1 text-gray-300 text-xs">↑↓</span>
                    )}
                  </th>
                ))}
                {showRowActions && <th className="px-4 py-3 w-20"></th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + (showRowActions ? 2 : 1)} className="text-center py-16">
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
                          strokeDasharray="32" strokeDashoffset="12"/>
                      </svg>
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : displayRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (showRowActions ? 2 : 1)} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <svg className="w-10 h-10 opacity-40" viewBox="0 0 40 40" fill="none">
                        <rect x="4" y="8" width="32" height="26" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M4 14h32M13 8v6M27 8v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M12 22h6M12 28h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <span className="text-sm">{emptyMessage}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                displayRows.map(row => (
                  <tr key={row.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <input type="checkbox"
                        checked={checkedRows.includes(row.id)}
                        onChange={() => setCheckedRows(prev =>
                          prev.includes(row.id) ? prev.filter(r => r !== row.id) : [...prev, row.id]
                        )}
                        className="w-4 h-4 accent-blue-600 cursor-pointer rounded"/>
                    </td>
                    {columns.map(col => (
                      <td key={col.key} className="px-4 py-3 text-gray-700">
                        {col.key === 'sno' ? (
                          <span className="text-blue-600 font-medium">{row[col.key]}</span>
                        ) : col.key === 'is_active' ? (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium
                            ${row[col.key] === true || row[col.key] === 'Active'
                              ? 'bg-green-50 text-green-600'
                              : 'bg-red-50 text-red-500'}`}>
                            {row[col.key] === true ? 'Active' : row[col.key] === false ? 'Inactive' : row[col.key]}
                          </span>
                        ) : (
                          <span>{row[col.key] ?? '—'}</span>
                        )}
                      </td>
                    ))}
                    {showRowActions && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {onEdit && (
                            <button onClick={() => onEdit(row)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none">
                                <path d="M13 3l4 4-9 9H4v-4l9-9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          )}
                          {onDelete && (
                            <button onClick={() => onDelete(row)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none">
                                <path d="M6 2h8M4 5h12l-1.5 12H5.5L4 5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="relative">
              <select value={curPageSize}
                onChange={e => handlePageSizeChange(Number(e.target.value))}
                className="appearance-none border border-gray-300 rounded-lg px-3 py-1.5 pr-7 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▼</span>
            </div>
            <span className="text-xs text-gray-500">
              Showing {displayRows.length
                ? `${(curPage - 1) * curPageSize + 1} to ${Math.min(curPage * curPageSize, curTotal)}`
                : '0 to 0'} of {curTotal} {totalLabel}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => handlePageChange(Math.max(1, curPage - 1))}
              disabled={curPage === 1}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            {pageButtons().map((p, i) => (
              p === '…'
                ? <span key={`e${i}`} className="w-8 text-center text-gray-400">…</span>
                : <button key={p} onClick={() => handlePageChange(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium border transition
                      ${p === curPage
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                    {p}
                  </button>
            ))}
            <button onClick={() => handlePageChange(Math.min(curTotalPages, curPage + 1))}
              disabled={curPage === curTotalPages}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
