'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';

const PAGE_SIZES = [10, 25, 50, 100];

function fieldDefault(field) {
  if (field.type === 'checkbox') return false;
  if (field.type === 'number') return '';
  return '';
}

function emptyForm(fields) {
  return {
    id: null,
    name: '',
    code: '',
    description: '',
    storeId: '',
    isActive: true,
    config: fields.reduce((acc, field) => ({ ...acc, [field.key]: field.defaultValue ?? fieldDefault(field) }), {}),
  };
}

function formatValue(field, value) {
  if (field.type === 'checkbox') return value ? 'Yes' : 'No';
  if (field.type === 'select') return field.options?.find((option) => option.value === value)?.label || value || '-';
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

export default function SettingsResourcePage({
  type,
  title,
  description,
  breadcrumbs = [],
  fields = [],
  storeScoped = false,
  codeLabel = 'Code',
}) {
  const endpoint = `/api/settings/${type}`;
  const [records, setRecords] = useState([]);
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(() => emptyForm(fields));
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const showToast = useCallback((message, variant = 'success') => {
    setToast({ message, variant });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`${endpoint}?${params}`, { cache: 'no-store', credentials: 'include' });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to load records');

      setRecords(json.data.records || []);
      setTotal(Number(json.data.total || 0));
      setTotalPages(Number(json.data.totalPages || 1));
    } catch (err) {
      showToast(err.message || 'Failed to load records', 'error');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, pageSize, search, showToast]);

  const fetchStores = useCallback(async () => {
    if (!storeScoped) return;
    try {
      const res = await fetch('/api/stores', { cache: 'no-store', credentials: 'include' });
      const json = await res.json();
      if (json.success) setStores(json.data?.stores || []);
    } catch {
      setStores([]);
    }
  }, [storeScoped]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const rows = useMemo(
    () =>
      records.map((record, index) => ({
        ...record,
        sno: (page - 1) * pageSize + index + 1,
      })),
    [records, page, pageSize]
  );

  const openCreate = () => {
    setForm(emptyForm(fields));
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setForm({
      id: record.id,
      name: record.name || '',
      code: record.code || '',
      description: record.description || '',
      storeId: record.storeId || '',
      isActive: record.isActive !== false,
      config: fields.reduce(
        (acc, field) => ({
          ...acc,
          [field.key]: record.config?.[field.key] ?? field.defaultValue ?? fieldDefault(field),
        }),
        {}
      ),
    });
    setModalOpen(true);
  };

  const setConfig = (key, value) => {
    setForm((current) => ({ ...current, config: { ...current.config, [key]: value } }));
  };

  const saveRecord = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Save failed');

      showToast(form.id ? `${title} updated` : `${title} created`);
      setModalOpen(false);
      fetchRecords();
    } catch (err) {
      showToast(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`${endpoint}?id=${deleteTarget.id}`, { method: 'DELETE', credentials: 'include' });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Delete failed');
      showToast(`${title} deleted`);
      setDeleteTarget(null);
      fetchRecords();
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    }
  };

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-100 p-6 text-sm text-gray-800">
        {toast && (
          <div className={`fixed right-4 top-4 z-[999] rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-lg ${toast.variant === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
            {toast.message}
          </div>
        )}

        <nav className="mb-4 flex items-center gap-1.5 text-xs text-gray-500">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.label} className="flex items-center gap-1.5">
              {index > 0 && <span className="text-gray-400">›</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="text-blue-500 hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-medium text-gray-700">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>

        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
          </div>
          <button onClick={openCreate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Create
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex justify-end border-b border-gray-100 px-4 py-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              className="w-64 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">S. No.</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">{codeLabel}</th>
                  {storeScoped && <th className="px-4 py-3 text-left font-semibold text-gray-600">Store</th>}
                  {fields.slice(0, 4).map((field) => (
                    <th key={field.key} className="px-4 py-3 text-left font-semibold text-gray-600">
                      {field.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={fields.length + 6} className="py-16 text-center text-gray-400">Loading...</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={fields.length + 6} className="py-16 text-center text-gray-400">No records found</td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-blue-600 font-medium">{row.sno}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{row.name}</td>
                      <td className="px-4 py-3 text-gray-700">{row.code || '-'}</td>
                      {storeScoped && <td className="px-4 py-3 text-gray-700">{row.storeName || 'All stores'}</td>}
                      {fields.slice(0, 4).map((field) => (
                        <td key={field.key} className="px-4 py-3 text-gray-700">
                          {formatValue(field, row.config?.[field.key])}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                          {row.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEdit(row)} className="mr-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                          Edit
                        </button>
                        <button onClick={() => setDeleteTarget(row)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <div className="flex items-center gap-3">
              <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm">
                {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
              <span className="text-xs text-gray-500">Showing {start} to {end} of {total} records</span>
            </div>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40">Prev</button>
              <span className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 z-[998] flex items-center justify-center bg-black/40 p-4">
            <form onSubmit={saveRecord} className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">{form.id ? 'Edit' : 'Create'} {title}</h2>
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-gray-200 px-3 py-1 text-sm">Close</button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-gray-600">Name</span>
                  <input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400" />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-gray-600">{codeLabel}</span>
                  <input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400" />
                </label>

                {storeScoped && (
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-gray-600">Store</span>
                    <select value={form.storeId} onChange={(event) => setForm((current) => ({ ...current, storeId: event.target.value }))} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400">
                      <option value="">All stores</option>
                      {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
                    </select>
                  </label>
                )}

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-gray-600">Status</span>
                  <select value={form.isActive ? 'true' : 'false'} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === 'true' }))} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </label>

                {fields.map((field) => (
                  <label key={field.key} className={field.type === 'textarea' ? 'block md:col-span-2' : 'block'}>
                    <span className="mb-1 block text-xs font-semibold text-gray-600">{field.label}</span>
                    {field.type === 'select' ? (
                      <select value={form.config[field.key] ?? ''} onChange={(event) => setConfig(field.key, event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400">
                        <option value="">Select</option>
                        {(field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea rows={3} value={form.config[field.key] ?? ''} onChange={(event) => setConfig(field.key, event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400" />
                    ) : field.type === 'checkbox' ? (
                      <input type="checkbox" checked={!!form.config[field.key]} onChange={(event) => setConfig(field.key, event.target.checked)} className="h-5 w-5 accent-blue-600" />
                    ) : (
                      <input type={field.type || 'text'} value={form.config[field.key] ?? ''} onChange={(event) => setConfig(field.key, event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400" />
                    )}
                  </label>
                ))}

                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs font-semibold text-gray-600">Description</span>
                  <textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400" />
                </label>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button>
                <button disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        )}

        {deleteTarget && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
              <h3 className="text-base font-bold text-gray-900">Delete {deleteTarget.name}?</h3>
              <p className="mt-2 text-sm text-gray-500">This setting will be removed permanently.</p>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setDeleteTarget(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button>
                <button onClick={deleteRecord} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
