'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';

const PAGE_SIZES = [10, 25, 50, 100];

// Permissions are loaded from the database via /api/employee/permissions

export default function PermissionsPage() {
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    if (openMenuId == null) return undefined;
    const onDoc = (e) => {
      if (e.target instanceof Node && e.target.closest?.('[data-permission-row-menu]')) {
        return;
      }
      setOpenMenuId(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [openMenuId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/employee/permissions')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed')))
      .then((data) => {
        if (cancelled) return;
        setPermissions(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) console.error('Failed to load permissions', err);
        setPermissions([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const rows = permissions;
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        String(r.id).includes(q) ||
        String(r.permissionName).toLowerCase().includes(q) ||
        String(r.displayName).toLowerCase().includes(q) ||
        String(r.description).toLowerCase().includes(q) ||
        String(r.permissionForOrg).toLowerCase().includes(q)
    );
  }, [search, permissions]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalCount = filtered.length;
  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalCount);

  const pageNumbers = useMemo(() => {
    const windowSize = 5;
    if (totalPages <= windowSize) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 3) return [1, 2, 3, 4, 5];
    if (page >= totalPages - 2) {
      return [
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ].filter((n) => n >= 1);
    }
    return [page - 2, page - 1, page, page + 1, page + 2];
  }, [page, totalPages]);

  return (
    <MainLayout>
      <div className="min-h-screen">
        <nav className="flex items-center gap-1.5 text-[12.5px] text-gray-500 mb-4">
          <Link href="/employee" className="text-blue-600 hover:underline font-medium">
            Employee
          </Link>
          <i className="ti ti-chevron-right text-[11px] text-gray-400" />
          <span className="text-blue-600 font-semibold">Permissions</span>
        </nav>

        <div className="mb-6">
          <h1 className="text-[22px] font-bold text-gray-900">List of Permissions</h1>
          <p className="text-[12.5px] text-gray-500 mt-1">
            List of all permissions with the users.{' '}
            <button type="button" className="text-blue-600 hover:underline font-medium">
              Need Help?
            </button>
          </p>
        </div>

        <div className="flex justify-end mb-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-full sm:w-[280px] shadow-sm">
            <i className="ti ti-search text-gray-400 text-[15px]" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-[13px] text-gray-700 outline-none flex-1 placeholder-gray-400 min-w-0"
            />
            {search ? (
              <button type="button" onClick={() => setSearch('')}>
                <i className="ti ti-x text-gray-400 text-[13px]" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 mb-3 flex justify-end shadow-sm">
          <button
            type="button"
            className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            title="Download"
          >
            <i className="ti ti-download text-[18px]" />
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-[12.5px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">
                    Permission ID
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">
                    Permission For ORG
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">
                    Permission For Interface
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">
                    Permission Name
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">
                    Display Name
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[220px]">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">
                    &nbsp;
                  </th>
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center text-gray-400 py-16 text-[13px]">
                      Loading permissions...
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-gray-400 py-16 text-[13px]">
                      No matching record found
                    </td>
                  </tr>
                ) : (
                  paginated.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-gray-100 hover:bg-gray-50/80 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{row.id}</td>
                      <td className="px-4 py-3 text-gray-800 whitespace-nowrap">
                        {row.permissionForOrg}
                      </td>
                      <td className="px-4 py-3 text-gray-800 whitespace-nowrap">
                        {row.permissionForInterface}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-mono text-[11.5px] whitespace-nowrap">
                        {row.permissionName}
                      </td>
                      <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{row.displayName}</td>
                      <td className="px-4 py-3 text-gray-600 leading-snug">{row.description}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          type="button"
                          className="text-blue-600 font-medium hover:underline"
                        >
                          View Users
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="relative inline-block text-left" data-permission-row-menu>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenuId((id) => (id === row.id ? null : row.id))
                          }
                          className="p-1 rounded-md text-gray-500 hover:bg-gray-100"
                          aria-label="Options"
                        >
                          <i className="ti ti-dots-vertical text-[18px]" />
                        </button>
                        {openMenuId === row.id ? (
                          <div className="absolute right-0 top-full mt-0.5 z-20 w-36 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 text-left"
                              onClick={() => setOpenMenuId(null)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 text-left"
                              onClick={() => setOpenMenuId(null)}
                            >
                              Duplicate
                            </button>
                          </div>
                        ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>


        <div className="flex flex-wrap items-center gap-3 mt-4">
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="appearance-none border border-gray-300 rounded-lg px-3 py-1.5 pr-7 bg-white text-[12.5px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 shadow-sm"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
              <i className="ti ti-chevron-down text-[11px]" />
            </span>
          </div>
          <span className="text-[12.5px] text-gray-500">
            Showing {startIndex} to {endIndex} of {totalCount} Results
          </span>

          {totalPages > 1 ? (
            <div className="flex items-center gap-0.5 ml-auto">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="min-w-[32px] h-8 px-2 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed"
              >
                &lt;
              </button>
              {pageNumbers.map((pg) => (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setPage(pg)}
                  className={`min-w-[32px] h-8 px-2 rounded-lg text-[12.5px] font-semibold transition-colors ${
                    page === pg
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {pg}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="min-w-[32px] h-8 px-2 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed"
              >
                &gt;
              </button>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="min-w-[32px] h-8 px-2 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed"
                title="Last page"
              >
                &gt;&gt;
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </MainLayout>
  );
}
