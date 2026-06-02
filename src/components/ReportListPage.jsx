'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
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

  const inferredReportKey = useMemo(() => {
    if (reportKey) return reportKey;
    const prefix = '/reports/';
    if (!pathname?.startsWith(prefix)) return '';
    return pathname.slice(prefix.length).replace(/^\/+|\/+$/g, '');
  }, [pathname, reportKey]);

  const effectiveApiPath = apiPath || (inferredReportKey ? `/api/reports/${inferredReportKey}` : '');

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
    const queryString = buildQuery(filterValues, { export: 'xlsx', columns: JSON.stringify(columns) });
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
  const showingFrom = filtered.length > 0 ? 1 : 0;
  const showingTo = Math.min(pageSize, filtered.length);

  return (
    <MainLayout>
      <div className="min-h-screen bg-transparent text-sm text-slate-800">

        {/* Breadcrumb */}
        <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-slate-400">›</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="text-indigo-600 hover:underline">{crumb.label}</Link>
              ) : (
                <span className="font-semibold text-slate-700">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>

        {/* Title */}
        <h1 className="mb-0.5 text-[22px] font-black tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {description && (
          <p className="mb-4 text-xs text-slate-500">
            {description.replace('Need Help?', '')}
            {description.includes('Need Help?') && (
              <a href="#" className="text-indigo-600 hover:underline">Need Help?</a>
            )}
          </p>
        )}

        {/* Filter Card */}
        {resolvedFiltersWithStores.length > 0 && (
          <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_1px_12px_rgba(15,23,42,0.04)] sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {resolvedFiltersWithStores.map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs font-medium text-slate-600">{f.label}</label>

                  {(f.type === 'date-range' || f.type === 'daterange') && (
                    <div className="relative">
                      <input
                        type="text"
                        value={filterValues[f.key]}
                        onChange={(e) => set(f.key, e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-9 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
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
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                      >
                        <option value="">Select</option>
                        {(f.options || []).map((o) => (
                          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
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
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Filter Actions */}
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={handleDownload}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50"
                title="Download"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none">
                  <path d="M10 3v10m0 0l-3-3m3 3l3-3M4 17h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                onClick={handleApply}
                disabled={loading}
                className="flex-1 rounded-xl bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 sm:flex-none"
              >
                {loading ? 'Loading...' : 'Apply'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Extra actions (e.g. Convert B2B to B2C) */}
        {extraActions && <div className="mb-3">{extraActions}</div>}

        {/* Search */}
        <div className="mb-2 flex justify-end">
          <div className="relative w-full sm:w-auto">
            <svg className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 20 20">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M15 15l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-56"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_1px_12px_rgba(15,23,42,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={handleAllCheck}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-indigo-600"
                    />
                  </th>
                  {columns.map((col) => (
                    <th key={col.key} className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">
                      {col.label}
                      <span className="ml-1 text-xs text-slate-300">▼ ⋮</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="py-20 text-center text-slate-400">
                      Loading report...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="py-20 text-center text-slate-400">
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-50 transition-colors hover:bg-indigo-50/50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={checkedRows.includes(row.id)}
                          onChange={() => setCheckedRows((prev) =>
                            prev.includes(row.id) ? prev.filter((r) => r !== row.id) : [...prev, row.id]
                          )}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-indigo-600"
                        />
                      </td>
                      {columns.map((col) => (
                        <td key={col.key} className="whitespace-nowrap px-4 py-3 text-slate-700">
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
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="appearance-none rounded-xl border border-slate-200 bg-white px-3 py-1.5 pr-7 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">▼</span>
          </div>
          <span className="text-xs text-slate-500">
            Showing {showingFrom} to {showingTo} of {filtered.length} {totalLabel}
          </span>
        </div>

      </div>
    </MainLayout>
  );
}
