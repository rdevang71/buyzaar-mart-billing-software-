'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';

const PAGE_SIZES = [10, 25, 50, 100];

async function fetchRoles() {
  const res = await fetch('/api/employee/roles');
  if (!res.ok) throw new Error('Failed to fetch roles');
  return res.json();
}

async function updateRole(payload) {
  const res = await fetch('/api/employee/roles', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update role');
  return data;
}

async function deleteRole(id) {
  const res = await fetch(`/api/employee/roles?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete role');
  return data;
}

const PERMISSION_OPTIONS = [
  { value: 'MANAGE_ROLES', label: 'Manage Roles' },
  { value: 'MANAGE_USERS', label: 'Manage Users' },
  { value: 'ACCESS_DASHBOARD', label: 'Access Module' },
  { value: 'MANAGE_DEVICES', label: 'Manage Devices' },
  { value: 'MANAGE_INVENTORY', label: 'Manage Inventory' },
  { value: 'MANAGE_CATALOG', label: 'Manage Catalog' },
  { value: 'VIEW_REPORTS', label: 'View Reports' },
  { value: 'MANAGE_STORES', label: 'Manage Stores' },
  { value: 'MANAGE_BILLING', label: 'Manage Billing' },
];

function normalizeRoleRow(row) {
  return {
    id: row.id,
    roleId: row.roleId ?? row.id,
    roleName: row.roleName ?? row.role_name ?? '',
    permissions: row.permissions ?? [],
    description: row.description ?? '',
    createdAt: row.createdAt ?? row.created_at ?? null,
  };
}

export default function RolesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [savingRole, setSavingRole] = useState(false);
  const [deletingRole, setDeletingRole] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    fetchRoles()
      .then((data) => {
        if (cancelled) return;
        setRoles(Array.isArray(data) ? data.map(normalizeRoleRow) : []);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load roles', err);
          setRoles([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) =>
      String(r.roleName).toLowerCase().includes(q) ||
      String(r.roleId).includes(q) ||
      String(r.description || '').toLowerCase().includes(q)
    );
  }, [roles, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalCount = filtered.length;
  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex   = Math.min(page * pageSize, totalCount);

  const refreshRoles = async () => {
    const data = await fetchRoles();
    setRoles(Array.isArray(data) ? data.map(normalizeRoleRow) : []);
  };

  const closeEditors = () => {
    setEditingRole(null);
    setDeleteTarget(null);
  };

  const handleEditSave = async (draft) => {
    if (!draft.roleName.trim()) return alert('Role name is required');
    if (draft.permissions.length === 0) return alert('At least one permission is required');

    setSavingRole(true);
    try {
      await updateRole({
        id: draft.id,
        role_name: draft.roleName,
        permissions: draft.permissions,
        description: draft.description,
      });
      await refreshRoles();
      closeEditors();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to update role');
    } finally {
      setSavingRole(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeletingRole(true);
    try {
      await deleteRole(deleteTarget.id);
      setRoles((current) => current.filter((role) => role.id !== deleteTarget.id));
      setPage(1);
      closeEditors();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to delete role');
    } finally {
      setDeletingRole(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12.5px] mb-5">
          <Link href="/employee" className="text-blue-600 hover:underline font-medium">
            Employee
          </Link>
          <i className="ti ti-chevron-right text-[11px] text-gray-400" />
          <span className="text-blue-600 font-semibold">Roles</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900">Roles</h1>
            <p className="text-[12.5px] text-gray-500 mt-1">
              List of all the roles{' '}
              <span className="text-blue-600 cursor-pointer hover:underline font-medium">Need Help?</span>
            </p>
          </div>
          <button
            onClick={() => router.push('/employee/customroles/createcustomrole')}
            className="self-start flex items-center gap-1.5 px-4 py-2 bg-blue-700 text-white rounded-lg text-[12.5px] font-semibold hover:bg-blue-800 transition-colors shadow-sm flex-shrink-0"
          >
            <i className="ti ti-plus text-[14px]" />
            Create Role
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
                    Role ID
                  </th>
                  <th className="px-5 py-3.5 text-left font-semibold text-gray-600 w-1/2">
                    Role Name
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="text-center text-gray-400 py-16 text-[13px]">
                      Loading roles...
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-gray-400 py-16 text-[13px]">
                      <i className="ti ti-shield-off text-[32px] mb-2 block" />
                      No roles found
                    </td>
                  </tr>
                ) : (
                  paginated.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-gray-100 hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-gray-700">{row.roleId}</td>
                      <td className="px-5 py-3.5 text-gray-700">{row.roleName}</td>
                      <td
                        className="px-4 py-3.5 relative"
                        ref={openMenuId === row.id ? menuRef : null}
                      >
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
                              onClick={() => {
                                setOpenMenuId(null);
                                setEditingRole({
                                  id: row.id,
                                  roleName: row.roleName,
                                  permissions: Array.isArray(row.permissions) ? row.permissions : [],
                                  description: row.description || '',
                                });
                              }}
                            >
                              <i className="ti ti-edit text-[13px] mr-2 text-blue-500" />
                              Edit
                            </button>
                            <button
                              className="block w-full text-left px-4 py-2 text-[12.5px] text-red-600 hover:bg-red-50 transition"
                              onClick={() => {
                                setOpenMenuId(null);
                                setDeleteTarget(row);
                              }}
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

          {/* Page number buttons */}
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
              const pg =
                totalPages <= 5 ? i + 1
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

      {editingRole && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-bold text-gray-900">Edit Role</h2>
              <button
                onClick={closeEditors}
                className="p-1.5 rounded-lg hover:bg-gray-100"
              >
                <i className="ti ti-x text-gray-500 text-[16px]" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-8">
              <div>
                <label className="text-[12px] text-gray-700 font-medium">Role Name *</label>
                <input
                  value={editingRole.roleName}
                  onChange={(e) => setEditingRole({ ...editingRole, roleName: e.target.value })}
                  placeholder="Enter Role Name"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[12px] text-gray-700 font-medium">Permissions *</label>
                <div className="mt-2 rounded-lg border border-gray-300 bg-white p-3 max-h-64 overflow-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PERMISSION_OPTIONS.map((option) => {
                      const checked = editingRole.permissions.includes(option.value);
                      return (
                        <label
                          key={option.value}
                          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-[13px] cursor-pointer transition-colors ${
                            checked ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setEditingRole((current) => ({
                                ...current,
                                permissions: e.target.checked
                                  ? [...current.permissions, option.value]
                                  : current.permissions.filter((permission) => permission !== option.value),
                              }));
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{option.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="col-span-2">
                <label className="text-[12px] text-gray-700 font-medium">Description</label>
                <textarea
                  value={editingRole.description}
                  onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                  placeholder="Description"
                  rows={5}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={closeEditors}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleEditSave(editingRole)}
                className="flex-1 py-2.5 bg-blue-700 text-white rounded-lg text-[13px] font-semibold hover:bg-blue-800 transition-colors"
                disabled={savingRole}
              >
                {savingRole ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold text-gray-900">Delete Role</h2>
              <button onClick={closeEditors} className="p-1.5 rounded-lg hover:bg-gray-100">
                <i className="ti ti-x text-gray-500 text-[16px]" />
              </button>
            </div>
            <p className="text-[13px] text-gray-600">
              Delete <span className="font-semibold text-gray-900">{deleteTarget.roleName}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-2 mt-6">
              <button
                onClick={closeEditors}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-[13px] font-semibold hover:bg-red-700 transition-colors"
                disabled={deletingRole}
              >
                {deletingRole ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
