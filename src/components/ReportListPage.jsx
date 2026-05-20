'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';

const PAGE_SIZES = [10, 25, 50, 100];

/**
 * ReportsListPage — shared layout for all individual report pages.
 *
 * Props:
 *  breadcrumbs   [{ label, href? }]
 *  title         string
 *  description   string
 *  filters       [{ key, label, type: 'date-range'|'select'|'text', options?: [] }]
 *  columns       [{ key, label }]
 *  rows          array of objects
 *  onApply       (filterValues) => void
 *  totalLabel    string
 *  emptyMessage  string
 *  extraActions  ReactNode   — e.g. "Convert B2B to B2C" button
 */
export default function ReportsListPage({
  breadcrumbs  = [],
  title        = '',
  description  = '',
  filters      = [],
  columns      = [],
  rows         = [],
  onApply,
  totalLabel   = 'Results',
  emptyMessage = 'No Rows To Show',
  extraActions = null,
}) {
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const todayStr = `${today} - ${today}`;

  const [regionOptions, setRegionOptions] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadRegions() {
      const hasRegionFilter = filters.some((filter) => filter.key === 'region' || /region/i.test(filter.label || ''));
      if (!hasRegionFilter) return;

      try {
        const res = await fetch('/api/regions', { cache: 'no-store', credentials: 'include' });
        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json?.success || cancelled) return;

        const records = Array.isArray(json?.data?.records) ? json.data.records : [];
        setRegionOptions(records.map((region) => ({ value: String(region.id), label: region.name })));
      } catch (err) {
        console.error('[ReportListPage] Failed to fetch regions', err);
        if (!cancelled) setRegionOptions([]);
      }
    }

    loadRegions();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const resolvedFilters = useMemo(
    () => filters.map((filter) => {
      const isRegionFilter = filter.key === 'region' || /region/i.test(filter.label || '');
      if (!isRegionFilter) return filter;

      return {
        ...filter,
        type: 'select',
        options: regionOptions.length > 0
          ? [{ value: 'all', label: 'All Regions' }, ...regionOptions]
          : (Array.isArray(filter.options) ? filter.options : []),
      };
    }),
    [filters, regionOptions]
  );

  const initValues = () => {
    const v = {};
    resolvedFilters.forEach((f) => {
      if (f.type === 'date-range') v[f.key] = todayStr;
      else v[f.key] = '';
    });
    return v;
  };

  const [filterValues, setFilterValues] = useState(initValues);
  const [search,       setSearch]       = useState('');
  const [pageSize,     setPageSize]     = useState(10);
  const [checkedRows,  setCheckedRows]  = useState([]);
  const [allChecked,   setAllChecked]   = useState(false);

  const set = (key, val) => setFilterValues((prev) => ({ ...prev, [key]: val }));

  const handleApply = () => onApply?.(filterValues);

  const handleAllCheck = () => {
    if (allChecked) { setCheckedRows([]); setAllChecked(false); }
    else { setCheckedRows(rows.map((r) => r.id)); setAllChecked(true); }
  };

  const filtered = rows.filter((row) =>
    Object.values(row).some((v) =>
      String(v).toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#f5f6fa] font-sans text-sm text-gray-800">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-gray-400">›</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="text-blue-500 hover:underline">{crumb.label}</Link>
              ) : (
                <span className="text-gray-700 font-semibold">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-0.5">{title}</h1>
        {description && (
          <p className="text-xs text-gray-500 mb-4">
            {description.replace('Need Help?', '')}
            {description.includes('Need Help?') && (
              <a href="#" className="text-blue-500 hover:underline">Need Help?</a>
            )}
          </p>
        )}

        {/* Filter Card */}
        {resolvedFilters.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {resolvedFilters.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>

                  {f.type === 'date-range' && (
                    <div className="relative">
                      <input
                        type="text"
                        value={filterValues[f.key]}
                        onChange={(e) => set(f.key, e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-9 text-sm bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none">
                          <rect x="3" y="4" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                          <path d="M3 8h14M7 2v3M13 2v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                      </span>
                    </div>
                  )}

                  {f.type === 'select' && (
                    <div className="relative">
                      <select
                        value={filterValues[f.key]}
                        onChange={(e) => set(f.key, e.target.value)}
                        className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-8 bg-white text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select</option>
                        {(f.options || []).map((o) => (
                          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </span>
                    </div>
                  )}

                  {f.type === 'text' && (
                    <input
                      type="text"
                      placeholder={f.placeholder || `Search for ${f.label.toLowerCase()}`}
                      value={filterValues[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
              <button
                className="p-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition text-gray-500"
                title="Download"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none">
                  <path d="M10 3v10m0 0l-3-3m3 3l3-3M4 17h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                onClick={handleApply}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Extra actions (e.g. Convert B2B to B2C) */}
        {extraActions && <div className="mb-3">{extraActions}</div>}

        {/* Search */}
        <div className="flex justify-end mb-2">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 20 20">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M15 15l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 w-56 border border-gray-200 rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={handleAllCheck}
                      className="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
                    />
                  </th>
                  {columns.map((col) => (
                    <th key={col.key} className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                      {col.label}
                      <span className="ml-1 text-gray-300 text-xs">▼ ⋮</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="text-center text-gray-400 py-20">
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={checkedRows.includes(row.id)}
                          onChange={() => setCheckedRows((prev) =>
                            prev.includes(row.id) ? prev.filter((r) => r !== row.id) : [...prev, row.id]
                          )}
                          className="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
                        />
                      </td>
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {row[col.key] ?? '-'}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center gap-4 mt-4">
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="appearance-none border border-gray-300 rounded-md px-3 py-1.5 pr-7 bg-white text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▼</span>
          </div>
          <span className="text-gray-500 text-xs">
            Showing 0 to 0 of {filtered.length} {totalLabel}
          </span>
        </div>

      </div>
    </MainLayout>
  );
}