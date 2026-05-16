"use client";

import MainLayout from '@/components/MainLayout';
import { useEffect, useState } from 'react';

const columns = [
  { key: 'sno', label: 'S. No.' },
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'amount_due', label: 'Amount Due' },
  { key: 'customer_type', label: 'Customer Type' },
];

export default function CustomerCreditSalePage() {
  const [store, setStore] = useState('All');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customer-credit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ store }) });
      const data = await res.json();
      setRows(Array.isArray(data.rows) ? data.rows : data.rows || []);
    } catch (err) {
      console.error(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <MainLayout>
      <div className="min-h-screen">
        <nav className="flex items-center gap-1.5 text-[12.5px] text-gray-500 mb-4 flex-wrap">
          <a href="/customer/dashboard" className="hover:text-blue-600 transition-colors">Customer</a>
          <i className="ti ti-chevron-right text-[11px] text-gray-400" />
          <span className="text-gray-900 font-semibold">Customer Credit Sale</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-[20px] md:text-[22px] font-bold text-gray-900">Customer Credit Sales</h1>
            <p className="text-[12.5px] text-gray-500 mt-1">Customer Credit Sales description can be found here <span className="text-blue-600 hover:underline">Need Help?</span></p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-[220px]">
                <label className="text-[12px] text-gray-700 mb-1 block">Select Store</label>
                <select value={store} onChange={(e) => setStore(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-700 bg-white">
                  <option>All</option>
                </select>
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <button onClick={fetchData} className="px-4 py-2 bg-blue-700 text-white rounded-lg">Fetch</button>
                <button className="p-2 rounded-lg hover:bg-gray-100"><i className="ti ti-download text-gray-600" /></button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {columns.map((col) => (
                    <th key={col.key} className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600 whitespace-nowrap">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={columns.length} className="px-4 py-6 text-gray-500">Loading...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={columns.length} className="px-4 py-16 text-center text-gray-400">No Records Found</td></tr>
                ) : rows.map((r, idx) => (
                  <tr key={r.id || idx} className="border-b border-gray-50 hover:bg-gray-50/60">
                    <td className="px-4 py-3 text-[13px] text-gray-700">{idx + 1}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{r.name || '-'}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{r.mobile_number || '-'}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{r.email_address || '-'}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{r.amount_due ?? '0.00'}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{r.customer_type || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 text-[12px] text-gray-400">
            <select className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-[12px] text-gray-600">
              <option>10</option>
              <option>20</option>
              <option>50</option>
            </select>
            <span>Showing {rows.length} Results</span>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}