'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';

const tabs = [
  { key: 'overview', label: 'Overview', icon: 'ti-layout-grid' },
  { key: 'stockin', label: 'Stock In', icon: 'ti-inbox' },
  { key: 'stockout', label: 'Stock Out', icon: 'ti-logout-2' },
  { key: 'transfers', label: 'Transfers', icon: 'ti-arrows-exchange' },
  { key: 'audit', label: 'Stock Audit', icon: 'ti-shield-check' },
  { key: 'batches', label: 'Batches - Expiry', icon: 'ti-box' },
];

const stats = [
  { label: 'Stock on hand', note: 'Across all stores', value: '-' },
  { label: 'SKUs out of stock', note: 'Zero or missing stock', value: '10/10' },
  { label: 'Stockout risk (7d)', note: 'Forecasted', value: '-', status: 'warning' },
  { label: 'Expiring <30 days', note: 'In the next 30 days', value: '0 batches' },
];

const quickFilters = [
  'Slowest-moving 20 items',
  'Stock value by category',
  'Variance by cashier this month',
  'Items not sold in 60 days',
  'Average days of cover per category',
];

const listConfig = {
  stockin: {
    title: 'Stock In',
    endpoint: '/api/inventory/stockin',
    headers: [
      'Transaction ID',
      'Invoice Number',
      'Destination',
      'Invoice Date',
      'Total Item Number',
      'Cost',
      'Reference Transaction Type',
      'Reference ID',
    ],
    map: (row) => ({
      'Transaction ID': row.transactionId ? `#${row.transactionId}` : `#STK-${row.id}`,
      'Invoice Number': row.invoiceNumber || '-',
      Destination: row.destination || '-',
      'Invoice Date': formatDate(row.invoiceDate),
      'Total Item Number': row.totalItems ?? 0,
      Cost: formatCost(row.cost),
      'Reference Transaction Type': row.referenceType || '-',
      'Reference ID': row.referenceId || '-',
    }),
  },
  stockout: {
    title: 'Stock Out',
    endpoint: '/api/inventory/stockout',
    headers: [
      'Transaction ID',
      'Invoice Number',
      'Destination',
      'Invoice Date',
      'Total Item Number',
      'Cost',
      'Reference Transaction Type',
      'Reference ID',
    ],
    map: (row) => ({
      'Transaction ID': row.transactionId ? `#${row.transactionId}` : `#STKO-${row.id}`,
      'Invoice Number': row.invoiceNumber || '-',
      Destination: row.destination || 'All',
      'Invoice Date': formatDate(row.invoiceDate),
      'Total Item Number': row.totalItems ?? 0,
      Cost: formatCost(row.cost),
      'Reference Transaction Type': row.referenceType || '-',
      'Reference ID': row.referenceId || '-',
    }),
  },
  transfers: {
    title: 'Transfers',
    endpoint: '/api/inventory/stocktransfer',
    headers: [
      'Transaction ID',
      'Invoice Number',
      'Source Name',
      'Destination Name',
      'Invoice Date',
      'Total Item Number',
      'Cost',
    ],
    map: (row) => ({
      'Transaction ID': row.transactionId ? `#${row.transactionId}` : `#TRN-${row.id}`,
      'Invoice Number': row.invoiceNumber || '-',
      'Source Name': row.sourceName || '-',
      'Destination Name': row.destinationName || '-',
      'Invoice Date': formatDate(row.invoiceDate),
      'Total Item Number': row.totalItems ?? 0,
      Cost: formatCost(row.cost),
    }),
  },
  audit: {
    title: 'Stock Audit',
    endpoint: '/api/inventory/stockvalidation',
    headers: [
      'Transaction ID',
      'Invoice Number',
      'Source Name',
      'Invoice Date',
      'Total Item Number',
      'Cost',
    ],
    map: (row) => ({
      'Transaction ID': row.transactionId ? `#${row.transactionId}` : `#AUD-${row.id}`,
      'Invoice Number': row.invoiceNumber || '-',
      'Source Name': row.sourceName || 'None',
      'Invoice Date': formatDate(row.invoiceDate),
      'Total Item Number': row.totalItems ?? 0,
      Cost: formatCost(row.cost),
    }),
  },
  batches: {
    title: 'Batches - Expiry',
    endpoint: null,
    headers: ['Batch ID', 'Product', 'Store', 'Expiry Date', 'Qty', 'Status'],
    map: (row) => row,
  },
};

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCost(value) {
  const n = Number(value || 0);
  return `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function InventoryOpsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [askQuery, setAskQuery] = useState('');

  const activeConfig = listConfig[activeTab];

  useEffect(() => {
    if (activeTab === 'overview') return;
    if (!activeConfig?.endpoint) {
      setRecords([]);
      return;
    }

    setLoading(true);
    fetch(activeConfig.endpoint)
      .then((res) => {
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then((data) => setRecords(Array.isArray(data) ? data : []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [activeTab, activeConfig?.endpoint]);

  const tableRows = useMemo(() => {
    if (!activeConfig) return [];
    return records.map(activeConfig.map);
  }, [activeConfig, records]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return tableRows;
    const q = searchTerm.trim().toLowerCase();
    const headers = activeConfig?.headers || [];
    return tableRows.filter((row) =>
      headers.some((header) => String(row[header] ?? '').toLowerCase().includes(q))
    );
  }, [tableRows, searchTerm, activeConfig?.headers]);

  const downloadCsv = (headers, rows, filename) => {
    const esc = (v) => {
      const s = String(v ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const lines = [headers.map(esc).join(',')];
    for (const row of rows) {
      lines.push(headers.map((h) => esc(row[h] ?? '')).join(','));
    }

    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    if (activeTab === 'overview') {
      alert('Select a tab to export transactions.');
      return;
    }
    if (!filteredRows.length) {
      alert('No records to export.');
      return;
    }

    const headers = activeConfig?.headers || [];
    const filename = `inventory-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(headers, filteredRows, filename);
  };

  const handleQuickFilter = (filter) => {
    const lowered = filter.toLowerCase();
    if (lowered.includes('variance')) {
      setActiveTab('audit');
      setSearchTerm('');
      return;
    }
    if (lowered.includes('not sold') || lowered.includes('slowest')) {
      setActiveTab('stockout');
      setSearchTerm('');
      return;
    }
    if (lowered.includes('stock value')) {
      setActiveTab('stockin');
      setSearchTerm('');
      return;
    }
    setActiveTab('transfers');
    setSearchTerm('');
  };

  const handleAsk = () => {
    if (!askQuery.trim()) {
      alert('Enter a question first.');
      return;
    }
    // Use stock-in tab as default searchable dataset for quick natural-language lookup.
    setActiveTab('stockin');
    setSearchTerm(askQuery.trim());
  };

  return (
    <MainLayout>
      <div className="flex items-center gap-2 text-[12px] text-gray-500 mb-4">
        <span className="text-blue-600">Home</span>
        <i className="ti ti-chevron-right text-[11px] text-gray-400" />
        <span className="font-semibold text-gray-900">Inventory</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[28px] font-semibold text-gray-900 leading-tight">Inventory</h1>
          <p className="text-[13px] text-gray-500 mt-1">2 stores · 10 products · Last sync a few seconds ago</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => router.push('/inventory/stockin')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-blue-300 text-[13px] font-medium text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <i className="ti ti-upload text-[16px]" />
            Import stock
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-blue-300 text-[13px] font-medium text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <i className="ti ti-download text-[16px]" />
            Export
          </button>
          <button
            type="button"
            onClick={() => router.push('/inventory/stockin')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-[13px] font-medium text-white hover:bg-gray-800 transition-colors"
          >
            <i className="ti ti-plus text-[16px]" />
            Stock In
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6 border-b border-gray-200 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                if (tab.key === 'batches') {
                  router.push('/inventory/batches');
                  return;
                }
                setActiveTab(tab.key);
              }}
              className={`flex items-center gap-2 pb-3 px-1 text-[13.5px] font-medium whitespace-nowrap border-b-2 transition-colors ${
                active
                  ? 'text-gray-900 border-b-gray-900'
                  : 'text-gray-500 border-b-transparent hover:text-gray-700'
              }`}
            >
              <i className={`ti ${tab.icon} text-[16px]`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' ? (
        <OverviewContent
          askQuery={askQuery}
          onAskQueryChange={setAskQuery}
          onAsk={handleAsk}
          onQuickFilterClick={handleQuickFilter}
          onViewAll={() => setActiveTab('stockin')}
        />
      ) : (
        <InventoryListPanel
          title={activeConfig.title}
          headers={activeConfig.headers}
          rows={filteredRows}
          loading={loading}
          emptyMessage={activeTab === 'batches' ? 'No expiring batches found' : 'No Records Found'}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
        />
      )}
    </MainLayout>
  );
}

function OverviewContent({ askQuery, onAskQueryChange, onAsk, onQuickFilterClick, onViewAll }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <p className="text-[12px] font-medium text-gray-500">{stat.label}</p>
            <div className="mt-3 flex items-end gap-2">
              {stat.value === '-' ? (
                <div className="w-10 h-1 rounded-full bg-gray-300" />
              ) : (
                <span className="text-[28px] font-bold text-gray-900">{stat.value}</span>
              )}
              {stat.status === 'warning' && (
                <i className="ti ti-alert-triangle text-orange-500 text-[18px]" />
              )}
            </div>
            <p className={`text-[11.5px] mt-2 ${stat.status === 'warning' ? 'text-orange-600' : 'text-gray-400'}`}>
              {stat.note}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-[#fff7ef] border border-orange-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full">
                QB INTELLIGENCE
              </span>
              <span className="text-[14px] font-semibold text-gray-900">Things to act on this week</span>
            </div>
            <p className="text-[12px] text-gray-600">Based on last 30 days</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3 bg-white rounded-xl p-4 border border-orange-100">
            <i className="ti ti-alert-circle text-orange-500 text-[18px] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-gray-900">AI insights not enabled for this chain</p>
              <p className="text-[12px] text-gray-500 mt-1">Contact your account manager to enable the Intelligence Reports add-on for your chain.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900">Recent stock movements</h3>
              <p className="text-[12px] text-gray-500 mt-0.5">Last 24 hours across all stores</p>
            </div>
            <button type="button" onClick={onViewAll} className="text-[12px] font-medium text-blue-600 hover:underline">
              View all <i className="ti ti-arrow-right text-[12px] inline ml-1" />
            </button>
          </div>
          <div className="flex items-center justify-center py-12">
            <p className="text-[13px] text-gray-400">No stock movements in the last 30 days.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900">Stockout forecast</h3>
              <p className="text-[12px] text-gray-500 mt-0.5">AI-predicted days of cover - top 8 at-risk SKUs</p>
            </div>
            <span className="text-[11px] font-medium text-orange-500 bg-orange-50 px-2.5 py-1 rounded-full">
              <i className="ti ti-sparkles text-[12px] inline mr-1" />
              AI
            </span>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <i className="ti ti-alert-circle text-orange-500 text-[24px] mx-auto mb-2" />
              <p className="text-[13px] font-semibold text-gray-900">AI insights not enabled for this chain</p>
              <p className="text-[12px] text-gray-500 mt-1">Enable Intelligence Reports to see which SKUs will run out first, with recommended reorder quantities.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex items-center gap-2 mb-4">
          <i className="ti ti-sparkles text-orange-500 text-[18px]" />
          <h3 className="text-[14px] font-semibold text-gray-900">Ask QB about your stock</h3>
        </div>
        <p className="text-[12px] text-gray-500 mb-4">Natural-language questions - English or Hinglish</p>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 focus-within:border-blue-400 focus-within:bg-white">
            <i className="ti ti-search text-gray-400 text-[16px]" />
            <input
              type="text"
              placeholder="e.g. Which SKUs have the most shrinkage this quarter?"
              value={askQuery}
              onChange={(e) => onAskQueryChange(e.target.value)}
              className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>
          <button type="button" onClick={onAsk} className="px-4 py-3 rounded-lg bg-gray-900 text-white text-[13px] font-semibold hover:bg-gray-800 transition-colors flex-shrink-0">
            Ask
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => onQuickFilterClick(filter)}
              className="px-3 py-2 rounded-lg bg-gray-100 text-[12px] font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function InventoryListPanel({ title, headers, rows, loading, emptyMessage, searchTerm, onSearchTermChange }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 justify-between flex-wrap">
        <div>
          <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>
          <p className="text-[12px] text-gray-400 mt-0.5">Confirmed inventory transactions</p>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-[340px] bg-gray-50 rounded-lg px-3 py-2">
          <i className="ti ti-search text-gray-400 text-[16px]" />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px]">
          <thead>
            <tr className="border-b border-gray-100">
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 tracking-wide uppercase">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                  {headers.map((header) => (
                    <td key={header} className="px-4 py-3 text-[13px] text-gray-700">
                      {row[header] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className="px-4 py-14 text-center text-[14px] text-blue-700 font-medium">
                  {loading ? 'Loading records...' : emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 text-[12px] text-gray-400">
        <select className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-[12px] text-gray-600">
          <option>10</option>
        </select>
        <span>Showing {rows.length ? 1 : 0} to {rows.length} of {rows.length} Results</span>
      </div>
    </div>
  );
}
