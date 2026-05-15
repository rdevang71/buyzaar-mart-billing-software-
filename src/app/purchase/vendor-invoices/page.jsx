'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';

const tableHeaders = [
  'Invoice ID',
  'Invoice Number',
  'Vendor Name',
  'PO ID',
  'Total Amount',
  'Amount Paid',
  'Amount Left',
  'Invoice Creation Date',
  'Due Date',
  'Created by',
  'Remarks',
  'Status',
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
    'Invoice Number': row.invoiceNumber || '—',
    'Vendor Name': row.vendorName || '—',
    'PO ID': row.poId ? `#${row.poId}` : '—',
    'Total Amount': formatCurrency(row.totalAmount),
    'Amount Paid': formatCurrency(row.amountPaid),
    'Amount Left': formatCurrency(row.amountLeft),
    'Invoice Creation Date': formatDate(row.invoiceDate || row.createdAt),
    'Due Date': formatDate(row.dueDate),
    'Created by': row.createdBy || 'System',
    'Remarks': row.remarks || '—',
    'Status': row.status || 'Pending',
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

export default function VendorInvoicesPage() {
  const router = useRouter();
  const [records, setRecords] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

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

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((row) => {
      const vendorMatch = vendorFilter === 'all' || String(row.vendorId) === String(vendorFilter);
      const statusMatch = statusFilter === 'all' || String(row.status || '').toLowerCase() === statusFilter.toLowerCase();
      const searchMatch = !q || [row.transactionId, row.invoiceNumber, row.vendorName, row.status, row.remarks]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));
      return vendorMatch && statusMatch && searchMatch;
    });
  }, [records, search, vendorFilter, statusFilter]);

  const tableData = useMemo(() => mapRecordsToTable(filteredRecords), [filteredRecords]);

  return (
    <MainLayout>
      <div className="flex items-center gap-2 text-[12px] text-gray-500 mb-4">
        <span className="text-blue-600">Purchase</span>
        <i className="ti ti-chevron-right text-[11px] text-gray-400" />
        <span className="font-semibold text-gray-900">Vendor Invoices</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[28px] font-semibold text-gray-900 leading-tight">List of all invoices</h1>
          <p className="text-[12.5px] text-gray-400 mt-1">List of all invoices Need Help?</p>
        </div>

        <button
          onClick={() => router.push('/purchase/vendor-invoices/create')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-[13px] font-medium text-white hover:bg-blue-700 transition-colors flex-shrink-0"
        >
          <i className="ti ti-plus text-[16px]" />
          Create Invoice
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-[12px] font-medium text-gray-800">Vendor:</label>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-[12px] bg-white text-gray-800"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>
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
                        {row[header] || '-'}
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
