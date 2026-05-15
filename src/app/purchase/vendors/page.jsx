 'use client';

import { useEffect, useState } from 'react';
import MainLayout from '@/components/MainLayout';

const tableHeaders = ['S. No.', 'Vendor Name', 'Mobile Number', 'Email Address', 'Address', 'Actions'];

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    company: '',
    short_code: '',
    business: '',
    address_1: '',
    address_2: '',
    city: '',
    state: '',
    pincode: '',
    country: '',
    email: '',
    mobile_number: '',
    gst_number: '',
    pan_number: '',
    margin: 0,
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vendors');
      const data = await res.json();
      setVendors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch vendors', err);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return alert('Vendor name is required');
    setSaving(true);
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setShowModal(false);
      setForm({
        name: '',
        company: '',
        short_code: '',
        business: '',
        address_1: '',
        address_2: '',
        city: '',
        state: '',
        pincode: '',
        country: '',
        email: '',
        mobile_number: '',
        gst_number: '',
        pan_number: '',
        margin: 0,
      });
      fetchVendors();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to save vendor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex items-center gap-2 text-[12px] text-gray-500 mb-4">
        <span className="text-blue-600">Purchase</span>
        <i className="ti ti-chevron-right text-[11px] text-gray-400" />
        <span className="font-semibold text-gray-900">Vendors</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[28px] font-semibold text-gray-900 leading-tight">Vendors</h1>
          <p className="text-[12.5px] text-gray-400 mt-1">Descriptive Text Need Help?</p>
        </div>

        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-[13px] font-medium text-white hover:bg-blue-700 transition-colors flex-shrink-0">
          <i className="ti ti-plus text-[16px]" />
          Create Vendor
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 justify-between flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-[340px] bg-gray-50 rounded-lg px-3 py-2">
            <i className="ti ti-search text-gray-400 text-[16px]" />
            <input
              type="text"
              placeholder="Search"
              className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <i className="ti ti-download text-gray-500 text-[16px]" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead>
              <tr className="border-b border-gray-100">
                {tableHeaders.map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 tracking-wide uppercase">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6" colSpan={6}>Loading...</td></tr>
              ) : vendors.length === 0 ? (
                <tr><td className="px-4 py-6" colSpan={6}>No vendors found</td></tr>
              ) : (
                vendors.map((row, rowIdx) => (
                  <tr key={row.id || rowIdx} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                    <td className="px-4 py-3 text-[13px] text-gray-700">{rowIdx + 1}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{row.name || '-'}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{row.mobile_number || '-'}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{row.email || '-'}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{[row.address_1, row.address_2, row.city, row.state, row.pincode].filter(Boolean).join(', ') || '-'}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">View</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 text-[12px] text-gray-400">
          <select className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-[12px] text-gray-600">
            <option>10</option>
            <option>20</option>
            <option>50</option>
          </select>
          <span>Showing {vendors.length} Results</span>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-[1000px] bg-white rounded-lg border border-gray-300 shadow-lg overflow-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Create Vendor</h3>
              <button className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100" onClick={() => setShowModal(false)}>
                <i className="ti ti-x text-[18px]" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <section className="border border-gray-300 rounded p-4 bg-white">
                <h4 className="text-sm text-blue-700 font-semibold mb-3">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[12px] text-gray-700">Vendor Name *</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-[12px] text-gray-700">Vendor Company</label>
                    <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500" />
                  </div>

                  <div>
                    <label className="text-[12px] text-gray-700">Vendor Short Code</label>
                    <input value={form.short_code} onChange={(e) => setForm({ ...form, short_code: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-[12px] text-gray-700">Business</label>
                    <input value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
              </section>

              <section className="border border-gray-300 rounded p-4 bg-white">
                <h4 className="text-sm text-blue-700 font-semibold mb-3">Address Information</h4>
                <div className="space-y-3">
                  <input value={form.address_1} onChange={(e) => setForm({ ...form, address_1: e.target.value })} placeholder="Address 1" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500" />
                  <input value={form.address_2} onChange={(e) => setForm({ ...form, address_2: e.target.value })} placeholder="Address 2" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500" />

                  <div className="grid grid-cols-2 gap-3">
                    <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500" />
                    <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" className="rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} placeholder="Pincode" className="rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500" />
                    <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Country" className="rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email Address" className="rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500" />
                    <input value={form.mobile_number} onChange={(e) => setForm({ ...form, mobile_number: e.target.value })} placeholder="Mobile Number" className="rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
              </section>

              <section className="border border-gray-300 rounded p-4 bg-white">
                <h4 className="text-sm text-blue-700 font-semibold mb-3">Other Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[12px] text-gray-700">GST Number</label>
                    <input value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-[12px] text-gray-700">PAN Number</label>
                    <input value={form.pan_number} onChange={(e) => setForm({ ...form, pan_number: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500" />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[12px] text-gray-700">Vendor Margin(%)</label>
                    <input type="number" value={form.margin} onChange={(e) => setForm({ ...form, margin: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
              </section>

              <div className="flex items-center justify-end gap-3">
                <button className="px-4 py-2 rounded-lg border border-gray-200 bg-white" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
