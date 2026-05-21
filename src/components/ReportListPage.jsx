'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';

const PAGE_SIZES = [10, 25, 50, 100];
const EMPTY_ARRAY = [];

function optionListsEqual(a = [], b = []) {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item.value === b[index]?.value && item.label === b[index]?.label);
}

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
  breadcrumbs  = EMPTY_ARRAY,
  title        = '',
  description  = '',
  filters      = EMPTY_ARRAY,
  columns      = EMPTY_ARRAY,
  rows         = EMPTY_ARRAY,
  reportKey    = '',
  apiPath      = '',
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
  const [storeOptions, setStoreOptions] = useState([]);
  const [remoteRows, setRemoteRows] = useState(EMPTY_ARRAY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const filterSignature = useMemo(
    () => filters.map((filter) => `${filter.key}:${filter.label}:${filter.type}`).join('|'),
    [filters]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadFilterOptions() {
      const hasRegionFilter = filters.some((filter) => filter.key === 'region' || /region/i.test(filter.label || ''));
      const hasStoreFilter = filters.some((filter) => filter.key === 'store' || /store/i.test(filter.label || ''));

      try {
        if (hasRegionFilter) {
          const res = await fetch('/api/regions', { cache: 'no-store', credentials: 'include' });
          const json = await res.json().catch(() => ({}));

          if (res.ok && json?.success && !cancelled) {
            const records = Array.isArray(json?.data?.records) ? json.data.records : [];
            const nextOptions = records.map((region) => ({ value: String(region.id), label: region.name }));
            setRegionOptions((prev) => optionListsEqual(prev, nextOptions) ? prev : nextOptions);
          }
        }

        if (hasStoreFilter) {
          const res = await fetch('/api/reports/dashboard', { cache: 'no-store', credentials: 'include' });
          const json = await res.json().catch(() => ({}));

          if (res.ok && json?.success && !cancelled) {
            const stores = Array.isArray(json?.data?.stores) ? json.data.stores : [];
            const nextOptions = stores.map((store) => ({ value: String(store.id), label: store.name }));
            setStoreOptions((prev) => optionListsEqual(prev, nextOptions) ? prev : nextOptions);
          }
        }
      } catch (err) {
        console.error('[ReportListPage] Failed to fetch filter options', err);
        if (!cancelled) {
          setRegionOptions([]);
          setStoreOptions([]);
        }
      }
    }

    loadFilterOptions();
    return () => {
      cancelled = true;
    };
  }, [filterSignature]);

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

  const resolvedFiltersWithStores = useMemo(
    () => resolvedFilters.map((filter) => {
      const isStoreFilter = filter.key === 'store' || /store/i.test(filter.label || '');
      if (!isStoreFilter) return filter;

      return {
        ...filter,
        type: 'select',
        options: storeOptions.length > 0
          ? [{ value: 'all', label: 'All Stores' }, ...storeOptions]
          : (Array.isArray(filter.options) ? filter.options : []),
      };
    }),
    [resolvedFilters, storeOptions]
  );

  const defaultFilterValues = useMemo(() => {
    const v = {};
    resolvedFiltersWithStores.forEach((f) => {
      if (f.type === 'date-range' || f.type === 'daterange') v[f.key] = todayStr;
      else v[f.key] = '';
    });
    return v;
  }, [resolvedFiltersWithStores, todayStr]);

  const [filterValues, setFilterValues] = useState(defaultFilterValues);
  const [search,       setSearch]       = useState('');
  const [pageSize,     setPageSize]     = useState(10);
  const [checkedRows,  setCheckedRows]  = useState([]);
  const [allChecked,   setAllChecked]   = useState(false);

  const set = (key, val) => setFilterValues((prev) => ({ ...prev, [key]: val }));

  const effectiveApiPath = apiPath || (reportKey ? `/api/reports/${reportKey}` : '');

  const buildQuery = (values, extra = {}) => {
    const params = new URLSearchParams();
    Object.entries(values || {}).forEach(([key, value]) => {
      if (!value || value === 'all' || value === 'All' || value === 'Select' || value === 'Select...') return;
      params.set(key, value);
    });
    Object.entries(extra).forEach(([key, value]) => params.set(key, value));
    return params.toString();
  };

  const fetchReportRows = async (values = filterValues) => {
    if (!effectiveApiPath) return;
    setLoading(true);
    setError('');

    try {
      const queryString = buildQuery(values);
      const res = await fetch(`${effectiveApiPath}${queryString ? `?${queryString}` : ''}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Unable to load report');
      }

      setRemoteRows(Array.isArray(json?.data?.rows) ? json.data.rows : []);
    } catch (err) {
      console.error('[ReportListPage] report fetch failed', err);
      setError(err.message || 'Unable to load report');
      setRemoteRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportRows(defaultFilterValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveApiPath]);

  const handleApply = () => {
    onApply?.(filterValues);
    fetchReportRows(filterValues);
  };

  const handleDownload = () => {
    if (!effectiveApiPath) return;
    const queryString = buildQuery(filterValues, { export: 'xlsx' });
    window.location.href = `${effectiveApiPath}?${queryString}`;
  };

  const handleAllCheck = () => {
    if (allChecked) { setCheckedRows([]); setAllChecked(false); }
    else { setCheckedRows(effectiveRows.map((r) => r.id)); setAllChecked(true); }
  };

  const effectiveRows = remoteRows.length || effectiveApiPath ? remoteRows : rows;
  const filtered = effectiveRows.filter((row) =>
    Object.values(row).some((v) =>
      String(v).toLowerCase().includes(search.toLowerCase())
    )
  );
  const pagedRows = filtered.slice(0, pageSize);

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
        {resolvedFiltersWithStores.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {resolvedFiltersWithStores.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>

                  {(f.type === 'date-range' || f.type === 'daterange') && (
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
                onClick={handleDownload}
                className="p-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition text-gray-500"
                title="Download"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none">
                  <path d="M10 3v10m0 0l-3-3m3 3l3-3M4 17h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                onClick={handleApply}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
              >
                {loading ? 'Loading...' : 'Apply'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
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
                {loading ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="text-center text-gray-400 py-20">
                      Loading report...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="text-center text-gray-400 py-20">
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row) => (
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
