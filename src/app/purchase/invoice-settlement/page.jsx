'use client';

import { useEffect, useMemo, useState } from 'react';
import MainLayout from '@/components/MainLayout';

const tableHeaders = [
  'Invoice ID',
  'Vendor Name',
  'Invoice Number',
  'Amount Due',
  'Amount Paid',
  'Amount Left',
  'Invoice Creation Date',
  'Invoice Due Date',
  'Invoice Status',
  'View Payment Details',
];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function mapRecordsToTable(records) {
  return (records || []).map((row) => ({
    'Invoice ID': row.transactionId ? `#${row.transactionId}` : `#INV-${String(row.id).padStart(4, '0')}`,
    'Vendor Name': row.vendorName || '—',
    'Invoice Number': row.invoiceNumber || '—',
    'Amount Due': formatCurrency(row.totalAmount),
    'Amount Paid': formatCurrency(row.amountPaid),
    'Amount Left': formatCurrency(row.amountLeft),
    'Invoice Creation Date': formatDate(row.invoiceDate || row.createdAt),
    'Invoice Due Date': formatDate(row.dueDate),
    'Invoice Status': row.status || 'Pending',
    'View Payment Details': 'View',
  }));
}

async function fetchVendorInvoices() {
  const res = await fetch('/api/vendor-invoices');
  if (!res.ok) throw new Error('Failed to fetch vendor invoices');
  return res.json();
}

async function fetchVendors() {
  const res = await fetch('/api/vendors');
  if (!res.ok) throw new Error('Failed to fetch vendors');
  return res.json();
}

export default function InvoiceSettlementPage() {
  const [records, setRecords] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [draftFilters, setDraftFilters] = useState({
    vendor: 'all',
    status: 'all',
  });
  const [filters, setFilters] = useState({
    vendor: 'all',
    status: 'all',
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchVendorInvoices(), fetchVendors()])
      .then(([invoiceData, vendorData]) => {
        setRecords(Array.isArray(invoiceData) ? invoiceData : []);
        setVendors(Array.isArray(vendorData) ? vendorData : []);
      })
      .catch(() => {
        setRecords([]);
        setVendors([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleApplyFilters = () => {
    setFilters(draftFilters);
  };

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((row) => {
      const vendorMatch = filters.vendor === 'all' || String(row.vendorId) === String(filters.vendor);
      const statusMatch = filters.status === 'all' || String(row.status || '').toLowerCase() === filters.status.toLowerCase();
      const searchMatch = !q || [row.transactionId, row.vendorName, row.invoiceNumber, row.status, row.remarks]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));
      return vendorMatch && statusMatch && searchMatch;
    });
  }, [records, search, filters]);

  const tableData = useMemo(() => mapRecordsToTable(filteredRecords), [filteredRecords]);

  return (
    <MainLayout>
      <div className="flex items-center gap-2 text-[12px] text-gray-500 mb-4">
        <span className="text-blue-600">Purchase</span>
        <i className="ti ti-chevron-right text-[11px] text-gray-400" />
        <span className="font-semibold text-gray-900">Invoice Settlement</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[28px] font-semibold text-gray-900 leading-tight">Vendor Invoice Credit Settlement</h1>
          <p className="text-[12.5px] text-gray-400 mt-1">Detail report for the vendor invoice credit settlement according to vendor and invoice status. Need Help?</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-[12px] font-medium text-gray-800">Vendor:</label>
            <select
              value={draftFilters.vendor}
              onChange={(e) => setDraftFilters({ ...draftFilters, vendor: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-[12px] bg-white text-gray-800"
            >
              <option value="all">ALL</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[12px] font-medium text-gray-800">Invoice Status:</label>
            <select
              value={draftFilters.status}
              onChange={(e) => setDraftFilters({ ...draftFilters, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-[12px] bg-white text-gray-800"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <button onClick={handleApplyFilters} className="px-4 py-2 rounded-lg bg-blue-600 text-[12px] font-medium text-white hover:bg-blue-700 transition-colors">
            Apply
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 justify-between flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-[340px] bg-gray-50 rounded-lg px-3 py-2">
            <i className="ti ti-search text-gray-400 text-[16px]" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>
          <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <i className="ti ti-download text-gray-500 text-[16px]" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
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
                <tr>
                  <td colSpan={tableHeaders.length} className="px-4 py-14 text-center text-[14px] text-gray-500">
                    Loading records...
                  </td>
                </tr>
              ) : tableData.length > 0 ? (
                tableData.map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                    {tableHeaders.map((header, colIdx) => (
                      <td key={colIdx} className="px-4 py-3 text-[13px] text-gray-700">
                        {header === 'View Payment Details' ? (
                          <button className="text-blue-600 font-medium hover:underline">View</button>
                        ) : (
                          row[header] || '-'
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={tableHeaders.length} className="px-4 py-14 text-center text-[14px] text-blue-700 font-medium">
                    No Records Found
                  </td>
                </tr>
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
          <span>Showing {tableData.length} Results</span>
        </div>
      </div>
    </MainLayout>
  );
}
