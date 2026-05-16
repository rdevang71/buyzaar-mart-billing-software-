"use client";

import MainLayout from '@/components/MainLayout';
import { useEffect, useMemo, useRef, useState } from 'react';
import CustomerSearchModal from '@/components/CustomerSearchModal';

function formatDisplayDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const columns = [
  { key: 'storeId', label: 'Store ID' },
  { key: 'storeName', label: 'Store Name' },
  { key: 'customerId', label: 'Customer ID' },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'customerAccountId', label: 'Customer Account ID' },
  { key: 'date', label: 'Date' },
  { key: 'transactionId', label: 'Transaction ID' },
  { key: 'posDate', label: 'POS Date' },
  { key: 'transactionType', label: 'Transaction Type' },
  { key: 'openingBalance', label: 'Opening Balance' },
  { key: 'transactionAmount', label: 'Transaction Amount' },
  { key: 'closingBalance', label: 'Closing Balance' },
  { key: 'transactionActivity', label: 'Transaction Activity' },
  { key: 'phone', label: 'Phone' },
  { key: 'paymentType', label: 'Payment Type' },
  { key: 'store', label: 'Store' },
  { key: 'remarks', label: 'Remarks' },
  { key: 'settlementStatus', label: 'Settlement Status' },
];

export default function CustomerLedgerPage() {
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [dateFrom, setDateFrom] = useState(todayIso);
  const [dateTo, setDateTo] = useState(todayIso);
  const [draftFrom, setDraftFrom] = useState(todayIso);
  const [draftTo, setDraftTo] = useState(todayIso);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef(null);
  const dateRange = `${formatDisplayDate(dateFrom)} - ${formatDisplayDate(dateTo)}`;
  const [regions, setRegions] = useState('0 Regions & 0 Stores');
  const [customer, setCustomer] = useState('');
  const [customerId, setCustomerId] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!showDatePicker) return;
    const handleClickOutside = (e) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  const openDatePicker = () => {
    setDraftFrom(dateFrom);
    setDraftTo(dateTo);
    setShowDatePicker(true);
  };

  const applyDateRange = () => {
    setDateFrom(draftFrom);
    setDateTo(draftTo > draftFrom ? draftTo : draftFrom);
    setShowDatePicker(false);
  };

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customer-ledger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dateRange, regions, customerId }) });
      const data = await res.json();
      setRows(data.rows || []);
    } catch (err) {
      console.error(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen">
        <nav className="flex items-center gap-1.5 text-[12.5px] text-gray-500 mb-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <a href="/customer/dashboard" className="hover:text-blue-600 transition-colors">Customer</a>
            <i className="ti ti-chevron-right text-[11px] text-gray-400" />
            <span className="text-gray-900 font-semibold">Customer Ledger</span>
          </span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-[20px] md:text-[22px] font-bold text-gray-900">Customer Ledger</h1>
            <p className="text-[12.5px] text-gray-500 mt-1">Descriptive text for customer ledger report. <span className="text-blue-600 cursor-pointer hover:underline font-medium">Need Help?</span></p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Filters row */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-full md:w-[260px]" ref={datePickerRef}>
                  <label className="text-[12px] text-gray-700 mb-1 block">Date Range</label>
                  <div className="relative">
                    <input
                      readOnly
                      value={dateRange}
                      onClick={openDatePicker}
                      className="w-full border border-gray-200 rounded-lg pl-3 pr-10 py-2 text-[13px] text-gray-700 bg-white cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={openDatePicker}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-100"
                      aria-label="Open date range calendar"
                    >
                      <i className="ti ti-calendar text-[16px] text-gray-500" />
                    </button>
                    {showDatePicker && (
                      <div className="absolute left-0 top-full z-30 mt-1 w-[260px] rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                        <p className="text-[11.5px] font-medium text-gray-600 mb-2">Select date range</p>
                        <div className="space-y-2">
                          <div>
                            <label className="text-[11px] text-gray-500 mb-1 block">From</label>
                            <input
                              type="date"
                              value={draftFrom}
                              onChange={(e) => setDraftFrom(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12.5px] text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-500 mb-1 block">To</label>
                            <input
                              type="date"
                              value={draftTo}
                              min={draftFrom}
                              onChange={(e) => setDraftTo(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12.5px] text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowDatePicker(false)}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] text-gray-600 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={applyDateRange}
                            className="px-3 py-1.5 rounded-lg bg-blue-700 text-[12px] text-white hover:bg-blue-800"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full md:w-[220px]">
                  <label className="text-[12px] text-gray-700 mb-1 block">Regions & Stores</label>
                  <select value={regions} onChange={(e) => setRegions(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-700 bg-white">
                    <option>0 Regions & 0 Stores</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 flex-1">
                  <div className="w-full">
                    <label className="text-[12px] text-gray-700 mb-1 block">Customer</label>
                    <div className="relative">
                      <input value={customer} readOnly onClick={() => setShowCustomerModal(true)} placeholder="Select customer" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-700 bg-white placeholder:text-gray-400 cursor-pointer" />
                      <button onClick={() => setShowCustomerModal(true)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-gray-100">
                        <i className="ti ti-search text-gray-500" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-6 md:mt-6">
                    <button onClick={fetchLedger} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-[13px]">{loading ? 'Loading...' : 'Fetch'}</button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button className="p-2 rounded-lg hover:bg-gray-100">
                  <i className="ti ti-download text-[16px] text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
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
                  <tr>
                    <td colSpan={columns.length} className="text-center py-16 text-gray-400">
                      <i className="ti ti-database-off text-[32px] mb-2 block" />
                      <p className="text-[13px]">No Records Found</p>
                    </td>
                  </tr>
                ) : rows.map((row) => (
                  <tr key={row.transactionId} className="border-b border-gray-50 hover:bg-gray-50/60">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-[13px] text-gray-700 whitespace-nowrap">{row[col.key] ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <div className="text-[12.5px] text-gray-500">Showing 0 to 0 of 0 Results</div>
            <div />
          </div>

        </div>
        {showCustomerModal && (
          <CustomerSearchModal
            open={showCustomerModal}
            onClose={() => setShowCustomerModal(false)}
            onSelect={(c) => { setCustomer(c.name); setCustomerId(c.id); }}
          />
        )}
      </div>
    </MainLayout>
  );
}