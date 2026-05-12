'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';

const PAGE_SIZES = [10, 25, 50, 100];

const sampleRows = [
  { id: 1, departmentId: 1, departmentName: 'IT' },
];

export default function EmployeeDepartmentsPage({ rows = sampleRows }) {
  const [search,      setSearch]      = useState('');
  const [pageSize,    setPageSize]    = useState(10);
  const [page,        setPage]        = useState(1);
  const [showCreate,  setShowCreate]  = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [openMenuId,  setOpenMenuId]  = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = rows.filter((r) =>
    String(r.departmentName).toLowerCase().includes(search.toLowerCase()) ||
    String(r.departmentId).includes(search)
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalCount = filtered.length;
  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex   = Math.min(page * pageSize, totalCount);

  return (
    <MainLayout>
      <div className="min-h-screen">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12.5px] mb-5">
          <Link href="/employee" className="text-blue-600 hover:underline font-medium">
            Employee
          </Link>
          <i className="ti ti-chevron-right text-[11px] text-gray-400" />
          <span className="text-blue-600 font-semibold">Employee Departments</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900">Employee Department</h1>
            <p className="text-[12.5px] text-gray-500 mt-1">
              List of all the departments{' '}
              <span className="text-blue-600 cursor-pointer hover:underline font-medium">Need Help?</span>
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="self-start flex items-center gap-1.5 px-4 py-2 bg-blue-700 text-white rounded-lg text-[12.5px] font-semibold hover:bg-blue-800 transition-colors shadow-sm flex-shrink-0"
          >
            <i className="ti ti-plus text-[14px]" />
            Create Employee Department
          </button>
        </div>

        {/* Search — top right */}
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-full sm:w-[280px] shadow-sm">
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

        {/* Table Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-5 py-3.5 text-left font-semibold text-gray-600 w-1/2">
                    Department ID
                  </th>
                  <th className="px-5 py-3.5 text-left font-semibold text-gray-600 w-1/2">
                    Department Name
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-gray-400 py-16 text-[13px]">
                      <i className="ti ti-building-off text-[32px] mb-2 block" />
                      No departments found
                    </td>
                  </tr>
                ) : (
                  paginated.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-gray-100 hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-gray-700">
                        {row.departmentId}
                      </td>
                      <td className="px-5 py-3.5 text-gray-700">
                        {row.departmentName}
                      </td>
                      <td className="px-4 py-3.5 relative" ref={openMenuId === row.id ? menuRef : null}>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === row.id ? null : row.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <i className="ti ti-dots-vertical text-gray-400 text-[14px]" />
                        </button>
                        {openMenuId === row.id && (
                          <div className="absolute right-4 top-10 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                            <button
                              className="block w-full text-left px-4 py-2 text-[12.5px] text-gray-700 hover:bg-gray-50 transition"
                              onClick={() => setOpenMenuId(null)}
                            >
                              <i className="ti ti-edit text-[13px] mr-2 text-blue-500" />
                              Edit
                            </button>
                            <button
                              className="block w-full text-left px-4 py-2 text-[12.5px] text-red-600 hover:bg-red-50 transition"
                              onClick={() => setOpenMenuId(null)}
                            >
                              <i className="ti ti-trash text-[13px] mr-2" />
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="appearance-none border border-gray-300 rounded-lg px-3 py-1.5 pr-7 bg-white text-[12.5px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 shadow-sm"
              >
                {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                <i className="ti ti-chevron-down text-[11px]" />
              </span>
            </div>
            <span className="text-[12.5px] text-gray-400">
              Showing {startIndex} to {endIndex} of {totalCount} Results
            </span>
          </div>

          {/* Page number buttons — right side */}
          <div className="flex items-center gap-1">
            {page > 1 && (
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <i className="ti ti-chevron-left text-gray-600 text-[14px]" />
              </button>
            )}
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
            {page < totalPages && (
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <i className="ti ti-chevron-right text-gray-600 text-[14px]" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Create Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-bold text-gray-900">Create Employee Department</h2>
              <button
                onClick={() => { setShowCreate(false); setNewDeptName(''); }}
                className="p-1.5 rounded-lg hover:bg-gray-100"
              >
                <i className="ti ti-x text-gray-500 text-[16px]" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">
                Department Name
              </label>
              <input
                type="text"
                placeholder="Enter department name"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                autoFocus
              />
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => { setShowCreate(false); setNewDeptName(''); }}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewDeptName(''); }}
                className="flex-1 py-2.5 bg-blue-700 text-white rounded-lg text-[13px] font-semibold hover:bg-blue-800 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
