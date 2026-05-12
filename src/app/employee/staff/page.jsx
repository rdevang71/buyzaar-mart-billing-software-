'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';

const PAGE_SIZES = [10, 25, 50, 100];

const columns = [
  { key: 'sno',              label: 'S.No' },
  { key: 'username',         label: 'Username' },
  { key: 'name',             label: 'Name' },
  { key: 'employeeCode',     label: 'Employee Code' },
  { key: 'role',             label: 'Role' },
  { key: 'department',       label: 'Department' },
  { key: 'employeeType',     label: 'Employee Type' },
  { key: 'contractorName',   label: 'Contractor Name' },
  { key: 'mobileNumber',     label: 'Mobile Number' },
  { key: 'emailAddress',     label: 'Email Address' },
  { key: 'employmentStatus', label: 'Employment Status' },
];

// Sample rows — replace with real data / API call
const sampleRows = [];

export default function EmployeeListPage({
  rows = sampleRows,
}) {
  const [search,       setSearch]       = useState('');
  const [pageSize,     setPageSize]     = useState(10);
  const [page,         setPage]         = useState(1);
  const [checkedRows,  setCheckedRows]  = useState([]);
  const [allChecked,   setAllChecked]   = useState(false);
  const [bulkOpen,     setBulkOpen]     = useState(false);
  const [showCreate,   setShowCreate]   = useState(false);

  // Filter dropdowns
  const [regionStore,   setRegionStore]   = useState('1 Regions & 2 Stores');
  const [empDept,       setEmpDept]       = useState('ALL');
  const [empType,       setEmpType]       = useState('ALL');

  const bulkRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (bulkRef.current && !bulkRef.current.contains(e.target)) setBulkOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = rows.filter((row) =>
    Object.values(row).some((v) =>
      String(v).toLowerCase().includes(search.toLowerCase())
    )
  );

  const totalPages  = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated   = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalCount  = filtered.length;
  const startIndex  = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex    = Math.min(page * pageSize, totalCount);

  const handleAllCheck = () => {
    if (allChecked) { setCheckedRows([]); setAllChecked(false); }
    else            { setCheckedRows(paginated.map((r) => r.id)); setAllChecked(true); }
  };

  const handleRowCheck = (id) =>
    setCheckedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );

  return (
    <MainLayout>
      <div className="min-h-screen">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12.5px] text-gray-500 mb-5">
          <Link href="/employee" className="text-blue-600 hover:underline font-medium">Employee</Link>
          <i className="ti ti-chevron-right text-[11px] text-gray-400" />
          <span className="text-blue-600 font-semibold">Employees</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900">Employees</h1>
            <p className="text-[12.5px] text-gray-500 mt-1">
              List of all the users and respective stores.{' '}
              <span className="text-blue-600 cursor-pointer hover:underline font-medium">Need Help?</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Bulk Operations */}
            <div className="relative" ref={bulkRef}>
              <button
                onClick={() => setBulkOpen((o) => !o)}
                className="flex items-center gap-1.5 px-4 py-2 border border-blue-600 text-blue-600 bg-white rounded-lg text-[12.5px] font-semibold hover:bg-blue-50 transition-colors shadow-sm"
              >
                Bulk Operations
                <i className={`ti ti-chevron-down text-[12px] transition-transform ${bulkOpen ? 'rotate-180' : ''}`} />
              </button>
              {bulkOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                  {['Export', 'Deactivate Selected', 'Delete Selected'].map((op) => (
                    <button
                      key={op}
                      onClick={() => setBulkOpen(false)}
                      className="block w-full text-left px-4 py-2 text-[12.5px] text-gray-700 hover:bg-gray-50 transition"
                    >
                      {op}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Create Employee */}
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 text-white rounded-lg text-[12.5px] font-semibold hover:bg-blue-800 transition-colors shadow-sm"
            >
              <i className="ti ti-plus text-[14px]" />
              Create Employee
            </button>
          </div>
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

        {/* Filter Card */}
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 mb-4 shadow-sm">
          <div className="flex items-end gap-4 flex-wrap">
            {/* Regions & Stores */}
            <div className="flex-1 min-w-[160px] max-w-[220px]">
              <p className="text-[11.5px] font-semibold text-gray-500 mb-1.5">Regions &amp; Stores</p>
              <div className="relative">
                <select
                  value={regionStore}
                  onChange={(e) => setRegionStore(e.target.value)}
                  className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-8 bg-white text-[12.5px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option>1 Regions &amp; 2 Stores</option>
                  <option>All Regions &amp; Stores</option>
                  <option>Region 1 Only</option>
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <i className="ti ti-chevron-down text-[12px]" />
                </span>
              </div>
            </div>

            {/* Employee Department */}
            <div className="flex-1 min-w-[160px] max-w-[220px]">
              <p className="text-[11.5px] font-semibold text-gray-500 mb-1.5">Employee Department</p>
              <div className="relative">
                <select
                  value={empDept}
                  onChange={(e) => setEmpDept(e.target.value)}
                  className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-8 bg-white text-[12.5px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option>ALL</option>
                  <option>Sales</option>
                  <option>Operations</option>
                  <option>Management</option>
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <i className="ti ti-chevron-down text-[12px]" />
                </span>
              </div>
            </div>

            {/* Employee Type */}
            <div className="flex-1 min-w-[160px] max-w-[220px]">
              <p className="text-[11.5px] font-semibold text-gray-500 mb-1.5">Employee Type</p>
              <div className="relative">
                <select
                  value={empType}
                  onChange={(e) => setEmpType(e.target.value)}
                  className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-8 bg-white text-[12.5px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option>ALL</option>
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contractor</option>
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <i className="ti ti-chevron-down text-[12px]" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-[12.5px]">
              <thead>
                <tr className="border-b border-gray-100 bg-white">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={handleAllCheck}
                      className="w-3.5 h-3.5 rounded border-gray-300 accent-blue-600 cursor-pointer"
                    />
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap"
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        {col.key !== 'employmentStatus' && (
                          <span className="text-gray-300 text-[10px] leading-none">↑↓</span>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="text-center text-gray-400 py-16 text-[13px]"
                    >
                      Staff list empty
                    </td>
                  </tr>
                ) : (
                  paginated.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={checkedRows.includes(row.id)}
                          onChange={() => handleRowCheck(row.id)}
                          className="w-3.5 h-3.5 rounded border-gray-300 accent-blue-600 cursor-pointer"
                        />
                      </td>
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {col.key === 'employmentStatus' && row[col.key] ? (
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold
                              ${row[col.key] === 'Active'
                                ? 'bg-green-50 text-green-600'
                                : 'bg-red-50 text-red-500'
                              }`}>
                              {row[col.key]}
                            </span>
                          ) : (
                            row[col.key] ?? <span className="text-gray-300">—</span>
                          )}
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
        <div className="flex items-center gap-3 mt-4">
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
            Showing {startIndex} to {endIndex} of {totalCount} staff(s)
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
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
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <i className="ti ti-chevron-right text-gray-600 text-[14px]" />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Create Employee Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-bold text-gray-900">Create Employee</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <i className="ti ti-x text-gray-500 text-[16px]" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Username',       placeholder: 'Enter username' },
                { label: 'Name',           placeholder: 'Enter full name' },
                { label: 'Employee Code',  placeholder: 'e.g. EMP001' },
                { label: 'Mobile Number',  placeholder: 'Enter mobile' },
                { label: 'Email Address',  placeholder: 'Enter email' },
              ].map((field) => (
                <div key={field.label} className={field.label === 'Email Address' ? 'col-span-2' : ''}>
                  <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    placeholder={field.placeholder}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                  />
                </div>
              ))}
              {[
                { label: 'Role',            options: ['Select role', 'Manager', 'Cashier', 'Staff'] },
                { label: 'Department',      options: ['Select department', 'Sales', 'Operations', 'Management'] },
                { label: 'Employee Type',   options: ['Select type', 'Full-time', 'Part-time', 'Contractor'] },
              ].map((field) => (
                <div key={field.label}>
                  <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">
                    {field.label}
                  </label>
                  <div className="relative">
                    <select className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 pr-8 text-[13px] text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all bg-white">
                      {field.options.map((o) => <option key={o}>{o}</option>)}
                    </select>
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <i className="ti ti-chevron-down text-[12px]" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 bg-blue-700 text-white rounded-lg text-[13px] font-semibold hover:bg-blue-800 transition-colors"
              >
                Create Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
