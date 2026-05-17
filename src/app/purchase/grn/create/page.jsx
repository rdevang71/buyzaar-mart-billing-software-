"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';

async function fetchStores() {
  const res = await fetch('/api/stores');
  if (!res.ok) throw new Error('Failed to fetch stores');
  return res.json();
}

async function postGrn(payload) {
  const res = await fetch('/api/purchase/grns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create GRN');
  return res.json();
}

export default function CreateGrnPage() {
  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [poId, setPoId] = useState('');
  const [destination, setDestination] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setLoadingStores(true);
    fetchStores()
      .then((data) => setStores(data || []))
      .catch(() => setStores([]))
      .finally(() => setLoadingStores(false));
  }, []);

  const handleSubmit = async () => {
    if (!poId) return alert('Please enter Purchase Order ID');
    setSubmitting(true);
    try {
      const payload = {
        poId,
        destination,
        vendorName,
        invoiceNumber,
        invoiceDate,
      };
      const created = await postGrn(payload);
      router.push(`/inventory/stockin/line-items?id=${encodeURIComponent(created.id)}`);
    } catch (err) {
      console.error(err);
      alert('Failed to create GRN');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex items-center gap-2 text-[12px] text-gray-500 mb-4">
        <span className="text-blue-600">Purchase</span>
        <i className="ti ti-chevron-right text-[11px] text-gray-400" />
        <span className="font-semibold text-gray-900">Create GRN</span>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h1 className="text-2xl font-semibold mb-4">Create Purchase GRN</h1>

          <div className="mb-4">
            <label className="block text-sm text-gray-700 font-medium mb-1">Purchase Order ID</label>
              <input
                value={poId}
                onChange={(e) => setPoId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
              />
          </div>

          <div className="mb-4">
            <label className="block text-sm text-gray-700 font-medium mb-1">Destination (Store)</label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
              >
              <option value="">Select Destination</option>
              {loadingStores ? <option>Loading...</option> : stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 font-medium mb-1">Vendor Name</label>
                <input
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
                />
            </div>
            <div>
              <label className="block text-sm text-gray-700 font-medium mb-1">Invoice Number</label>
                <input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
                />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm text-gray-700 font-medium mb-1">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
              />
          </div>

          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-[13px]" onClick={() => router.back()}>Back</button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-[13px] font-medium text-white hover:bg-blue-700" onClick={handleSubmit} disabled={submitting}>{submitting ? '...' : 'Create GRN'}</button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
