'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function EditBrandPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [form, setForm] = useState({ name: '', description: '', manufacturer_id: '', is_active: true });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [manufacturers, setManufacturers] = useState([]);

  useEffect(() => {
    fetch(`/api/catalog/brands/${id}`)
      .then(r => r.json())
      .then(json => { if (json.success) setForm({ name: json.data.name || '', description: json.data.description || '', manufacturer_id: json.data.manufacturer_id || '', is_active: json.data.is_active }); })
      .catch(() => {});

    fetch('/api/catalog/manufacturers?pageSize=100')
      .then(r => r.json())
      .then(json => { if (json.success) setManufacturers(json.data.records); })
      .catch(() => {});
  }, [id]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const set = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Brand name is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/catalog/brands/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const json = await res.json();
      if (json.success) {
        showToast('Brand updated successfully');
        setTimeout(() => router.push('/catalog/brand'), 800);
      } else {
        showToast(json.message || 'Failed to update brand', 'error');
        if (json.errors) setErrors(json.errors);
      }
    } catch {
      showToast('Something went wrong', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-sm">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.msg}
        </div>
      )}

      <div className="px-6 pt-5 pb-1">
        <nav className="flex items-center gap-1.5 text-xs text-gray-500">
          <Link href="/catalog" className="text-blue-500 hover:underline">Catalog</Link>
          <span>›</span>
          <Link href="/catalog/category" className="text-blue-500 hover:underline">Product Classification</Link>
          <span>›</span>
          <Link href="/catalog/brand" className="text-blue-500 hover:underline">Brand</Link>
          <span>›</span>
          <span className="text-gray-700 font-medium">Edit Brand</span>
        </nav>
      </div>

      <div className="flex items-start justify-between px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Edit Brand</h1>
          <p className="text-xs text-gray-500 mt-0.5">Modify brand details.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/catalog/brand')}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
            Back
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-60">
            {loading ? 'Saving...' : 'Save Brand'}
          </button>
        </div>
      </div>

      <div className="mx-6 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-base font-bold text-blue-600 mb-6">Brand Information</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Enter Brand Name"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${errors.name ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}/>
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
            <div className="relative">
              <select value={form.manufacturer_id} onChange={e => set('manufacturer_id', e.target.value)}
                className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2.5 pr-9 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Default manufacturer</option>
                {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </span>
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => set('is_active', true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${form.is_active ? 'bg-green-50 border-green-400 text-green-700' : 'bg-white border-gray-300 text-gray-500'}`}>
                Active
              </button>
              <button type="button" onClick={() => set('is_active', false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${!form.is_active ? 'bg-red-50 border-red-400 text-red-600' : 'bg-white border-gray-300 text-gray-500'}`}>
                Inactive
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
