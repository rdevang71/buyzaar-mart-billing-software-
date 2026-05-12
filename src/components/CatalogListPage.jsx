'use client';

import { useState } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';

export default function CatalogListPage({
  // Breadcrumb: array of { label, href }
  breadcrumbs = [],
  // Page heading
  title = '',
  description = '',
  // Button label
  createLabel = 'Create',
  // Table columns: [{ key, label, sortable }]
  columns = [],
  // Table rows: array of objects
  rows = [],
  // Extra action per row (e.g. "View Products" link)
  rowAction = null,
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = rows.filter((r) =>
    columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(search.toLowerCase()))
  );

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const va = String(a[sortKey] ?? ''), vb = String(b[sortKey] ?? '');
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      })
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  const toggleSelect = (id) =>
    setSelected((p) => p.includes(id) ? p.filter((i) => i !== id) : [...p, id]);
  const toggleAll = () =>
    setSelected(selected.length === paginated.length ? [] : paginated.map((r) => r.id));

  return (
    <MainLayout>
      <div className="min-h-screen">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12.5px] text-gray-500 mb-4 flex-wrap">
          {breadcrumbs.map((b, i) => (
            <span key={b.label} className="flex items-center gap-1.5">
              {i > 0 && <i className="ti ti-chevron-right text-[11px] text-gray-400" />}
              {b.href
                ? <Link href={b.href} className="hover:text-blue-600 transition-colors">{b.label}</Link>
                : <span className="text-gray-900 font-semibold">{b.label}</span>
              }
            </span>
          ))}
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-[20px] md:text-[22px] font-bold text-gray-900">{title}</h1>
            <p className="text-[12.5px] text-gray-500 mt-1">
              {description}{' '}
              <span className="text-blue-600 cursor-pointer hover:underline font-medium">Need Help?</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-[12.5px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              Bulk Operations
              <i className="ti ti-chevron-down text-[12px]" />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-700 text-white rounded-lg text-[12.5px] font-semibold hover:bg-blue-800 transition-colors"
            >
              <i className="ti ti-plus text-[14px]" />
              {createLabel}
            </button>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Search row */}
          <div className="flex justify-end px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 w-full sm:w-[260px]">
              <i className="ti ti-search text-gray-400 text-[15px]" />
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="bg-transparent text-[13px] text-gray-700 outline-none flex-1 placeholder-gray-400 min-w-0"
              />
              {search && (
                <button onClick={() => setSearch('')}>
                  <i className="ti ti-x text-gray-400 text-[13px]" />
                </button>
              )}
            </div>
          </div>

          {/* Table — scrollable on mobile */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.length === paginated.length && paginated.length > 0}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                    />
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => col.sortable !== false && toggleSort(col.key)}
                      className={`px-4 py-3 text-left text-[12px] font-semibold text-gray-600 whitespace-nowrap
                        ${col.sortable !== false ? 'cursor-pointer hover:text-blue-600 select-none' : ''}`}
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        {col.sortable !== false && (
                          <span className="text-gray-400 text-[11px]">
                            {sortKey === col.key
                              ? sortDir === 'asc' ? '↑' : '↓'
                              : '↑↓'}
                          </span>
                        )}
                      </span>
                    </th>
                  ))}
                  {rowAction && <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">View</th>}
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 3} className="text-center py-16 text-gray-400">
                      <i className="ti ti-database-off text-[32px] mb-2 block" />
                      <p className="text-[13px]">No records found</p>
                    </td>
                  </tr>
                ) : paginated.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`border-b border-gray-50 transition-colors
                      ${selected.includes(row.id) ? 'bg-blue-50/40' : idx % 2 === 0 ? 'bg-white hover:bg-gray-50/60' : 'bg-gray-50/30 hover:bg-gray-50/60'}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                      />
                    </td>
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-[13px] text-gray-700 whitespace-nowrap">
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? <span className="text-gray-300">—</span>)}
                      </td>
                    ))}
                    {rowAction && (
                      <td className="px-4 py-3">
                        <button className="text-[12.5px] text-blue-600 font-medium hover:underline">
                          {rowAction}
                        </button>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <i className="ti ti-dots-vertical text-gray-400 text-[14px]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer: per-page + info + pagination */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <select
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                className="border border-gray-300 rounded-lg px-2 py-1 text-[12.5px] text-gray-600 bg-white outline-none cursor-pointer"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-[12.5px] text-gray-500">
                Showing {sorted.length === 0 ? 0 : (page - 1) * perPage + 1} to{' '}
                {Math.min(page * perPage, sorted.length)} of {sorted.length}{' '}
                {title}(s)
              </span>
            </div>

            {/* Pagination */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <i className="ti ti-chevron-left text-gray-600 text-[14px]" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pg = totalPages <= 5 ? i + 1
                  : page <= 3 ? i + 1
                  : page >= totalPages - 2 ? totalPages - 4 + i
                  : page - 2 + i;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`w-8 h-8 rounded-lg text-[12.5px] font-semibold transition-colors
                      ${page === pg ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <i className="ti ti-chevron-right text-gray-600 text-[14px]" />
              </button>
            </div>
          </div>
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.4)'}}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[16px] font-bold text-gray-900">{createLabel}</h2>
                <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <i className="ti ti-x text-gray-500 text-[16px]" />
                </button>
              </div>
              {columns.filter((c) => c.key !== 'sno').map((col) => (
                <div key={col.key} className="mb-4">
                  <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">{col.label}</label>
                  <input
                    type="text"
                    placeholder={`Enter ${col.label}`}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                  />
                </div>
              ))}
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 bg-blue-700 text-white rounded-lg text-[13px] font-semibold hover:bg-blue-800 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
}