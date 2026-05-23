'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';

const PAGE_SIZES = [10, 25, 50, 100];

export default function CatalogListPage({
  breadcrumbs = [],
  title = '',
  description = '',
  filters = null,
  createLabel = null,
  onCreateClick,
  bulkOperations = true,
  bulkImportType = null, // 'categories' | 'sub-categories'
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

  // ── Download template ──────────────────────────────────────
  const downloadTemplate = async () => {
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
          'image_url',
            'manage_inventory_enabled',
            'inventory_store_name',
            'opening_stock_qty',
            'default_low_stock_value',
            'disable_billing_on_zero',
            'disable_sales_on_expiry',
            'inventory_method',
            'stock_item_type',
            'dimension_unit',
            'length',
            'width',
            'height',
            'weight_unit',
            'weight_value',
          ];

    // Keep template headers strictly aligned with the product creation form.
    // Skip dynamic per-store columns to avoid malformed/duplicate headers.
    const headers = [...baseHeaders];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, getTemplateFileName());
    setBulkOpen(false);
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
      const parsed = XLSX.utils.sheet_to_json(ws, { defval: '' });

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
          <div className="bg-white rounded-xl shadow-xl p-6 w-80">
            <h3 className="text-base font-bold text-gray-800 mb-3">Import Complete</h3>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Imported</span>
                <span className="font-semibold text-green-600">{importResult.inserted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Skipped</span>
                <span className="font-semibold text-orange-500">{importResult.skipped}</span>
              </div>
              {importResult.errors?.length > 0 && (
                <div className="mt-2 bg-red-50 rounded-lg p-3 text-xs text-red-600 max-h-32 overflow-y-auto">
                  {importResult.errors.map((e, i) => (
                    <p key={i}>{e.row}: {e.error}</p>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setImportResult(null)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
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