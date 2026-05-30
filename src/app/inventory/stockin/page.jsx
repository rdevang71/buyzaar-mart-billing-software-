"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import InventoryShell from '@/components/inventory/InventoryShell';
import { getBulkField, parseBulkSheet, pickSpreadsheetFile, toBoolean } from '@/lib/bulkSheet';

async function fetchStores() {
  const res = await fetch('/api/stores');
  if (!res.ok) throw new Error('Failed to fetch stores');
  const json = await res.json();
  return json.data?.records || json.data?.stores || json.stores || [];
}

async function fetchStockInList(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.dateFrom) params.set('date_from', filters.dateFrom);
  if (filters.dateTo) params.set('date_to', filters.dateTo);
  if (filters.source) params.set('source', filters.source);
  const qs = params.toString();
  const res = await fetch(`/api/inventory/stockin${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch stock in records');
  return res.json();
}

async function postStockIn(payload) {
  const res = await fetch('/api/inventory/stockin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create stock in');
  return res.json();
}

const tableHeaders = [
  'Transaction ID',
  'Invoice Number',
  'Destination',
  'Invoice Date',
  'Total Item Number',
  'Cost',
  'Reference Transaction Type',
  'Reference ID',
];

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCost(value) {
  const n = Number(value || 0);
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function mapRecordsToTable(records) {
  return (records || []).map((row) => ({
    'Transaction ID': row.transactionId ? `#${row.transactionId}` : `#STK-${row.id}`,
    'Invoice Number': row.invoiceNumber || '—',
    'Destination': row.destination || '—',
    'Invoice Date': formatDate(row.invoiceDate),
    'Total Item Number': row.totalItems ?? 0,
    'Cost': formatCost(row.cost),
    'Reference Transaction Type': row.referenceType || '—',
    'Reference ID': row.referenceId || '—',
  }));
}

function downloadCsv(rows) {
  const headers = tableHeaders;
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `stock-in-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const MAX_INVOICE_UPLOAD_BYTES = 5 * 1024 * 1024;

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

export default function StockInPage() {
  const [showModal, setShowModal] = useState(false);
  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [activeTab, setActiveTab] = useState('new');
  const [sourceType, setSourceType] = useState('warehouse');
  const [destination, setDestination] = useState('');
  const [vendors, setVendors] = useState([]);
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [applyTaxes, setApplyTaxes] = useState(true);
  const [addProductsPrefill, setAddProductsPrefill] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [filters, setFilters] = useState({ search: '', dateFrom: '', dateTo: '', source: '' });
  const fileInputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    setLoadingList(true);
    fetchStockInList(filters)
      .then((data) => setTableData(mapRecordsToTable(data)))
      .catch(() => setTableData([]))
      .finally(() => setLoadingList(false));
  }, [filters]);

  useEffect(() => {
    if (!showModal) return;
    setLoadingStores(true);
    Promise.all([
      fetchStores().catch(() => []),
      fetch('/api/vendors?pageSize=500').then((r) => r.json()).catch(() => []),
    ])
      .then(([storeData, vendorData]) => {
        setStores(Array.isArray(storeData) ? storeData : []);
        setVendors(Array.isArray(vendorData) ? vendorData : []);
      })
      .catch(() => {
        setStores([]);
        setVendors([]);
      })
      .finally(() => setLoadingStores(false));
  }, [showModal]);

  const handleOpen = () => setShowModal(true);
  const handleClose = () => {
    setShowModal(false);
    setSelectedFile(null);
  };

  const handleBulkImport = async () => {
    try {
      const file = await pickSpreadsheetFile();
      if (!file) return;

      const rows = await parseBulkSheet(file);
      if (!rows.length) {
        alert('No rows found in selected file.');
        return;
      }

      const created = [];
      let failed = 0;

      for (const row of rows) {
        const destinationId = getBulkField(row, ['destination_id', 'destination', 'store_id']);
        if (!destinationId) {
          failed += 1;
          continue;
        }

        try {
          const payload = {
            method: 'new',
            destination: String(destinationId),
            applyTaxes: toBoolean(getBulkField(row, ['apply_taxes']), true),
            addProductsPrefill: toBoolean(getBulkField(row, ['add_products_prefill']), true),
          };
          const draft = await postStockIn(payload);
          created.push(draft);
        } catch {
          failed += 1;
        }
      }

      if (!created.length) {
        alert('Could not import any row. Check columns like destination_id / destination.');
        return;
      }

      setLoadingList(true);
      fetchStockInList(filters)
        .then((data) => setTableData(mapRecordsToTable(data)))
        .catch(() => setTableData([]))
        .finally(() => setLoadingList(false));

      alert(`Bulk import complete: ${created.length} draft(s) created${failed ? `, ${failed} failed` : ''}. Opening the first draft.`);
      router.push(`/inventory/stockin/line-items?id=${encodeURIComponent(created[0].id)}`);
    } catch (err) {
      console.error(err);
      alert('Bulk import failed. Please use a valid Excel/CSV file.');
    }
  };

  const handleNext = async () => {
    if (!destination) return alert('Please select a destination');
    if (sourceType === 'vendor' && selectedVendorIds.length === 0) {
      return alert('Please select at least one vendor');
    }
    setSubmitting(true);
    try {
      const payload = {
        method: activeTab === 'new' ? 'new' : 'purchase_order',
        destination,
        sourceType,
        vendorIds: sourceType === 'vendor' ? selectedVendorIds : [],
        vendorNames: sourceType === 'vendor'
          ? vendors.filter((vendor) => selectedVendorIds.includes(String(vendor.id))).map((vendor) => vendor.name)
          : [],
        applyTaxes,
        addProductsPrefill,
      };
      const created = await postStockIn(payload);
      const stockId = created.id;
      setShowModal(false);
      router.push(`/inventory/stockin/line-items?id=${encodeURIComponent(stockId)}`);
    } catch (err) {
      console.error(err);
      alert('Failed to create stock in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <InventoryShell
        breadcrumb={[{ label: 'Inventory' }, { label: 'Stock In' }]}
        title="Stock In"
        subtitle="Stock In transaction history of last 7 days. Need Help?"
        actions={[{ label: 'Add In Bulk (Excel)', onClick: handleBulkImport }, { label: 'Add Stock', primary: true, onClick: handleOpen }]}
        searchPlaceholder="Search"
        searchValue={filters.search}
        onSearchChange={(value) => setFilters((current) => ({ ...current, search: value }))}
        filters={(
          <>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((current) => ({ ...current, dateFrom: e.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-[12.5px] text-gray-700"
              title="From date"
            />
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((current) => ({ ...current, dateTo: e.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-[12.5px] text-gray-700"
              title="To date"
            />
            <select
              value={filters.source}
              onChange={(e) => setFilters((current) => ({ ...current, source: e.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-[12.5px] text-gray-700"
            >
              <option value="">All Sources</option>
              <option value="product">Product</option>
              <option value="purchase_order">Purchase Order</option>
              <option value="grn">GRN</option>
            </select>
            <button
              type="button"
              onClick={() => setFilters({ search: '', dateFrom: '', dateTo: '', source: '' })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-[12.5px] text-gray-600 hover:bg-gray-50"
            >
              Clear
            </button>
          </>
        )}
        onDownload={() => downloadCsv(tableData)}
        tableHeaders={tableHeaders}
        tableData={loadingList ? [] : tableData}
        emptyMessage={loadingList ? 'Loading records…' : 'No Records Found'}
      />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
          <div className="relative bg-white w-full max-w-2xl rounded-md shadow-lg overflow-hidden max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex min-h-0 flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Step 1 : Stock In Method</h3>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              <div className="flex items-center gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('new')}
                  className={`px-4 py-2 rounded-md border ${activeTab === 'new' ? 'bg-blue-50 border-blue-200 text-gray-900' : 'bg-white border-gray-200 text-gray-700'}`}
                >
                  New Stock Received
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('po')}
                  className={`px-4 py-2 rounded-md border ${activeTab === 'po' ? 'bg-blue-50 border-blue-200 text-gray-900' : 'bg-white border-gray-200 text-gray-700'}`}
                >
                  Purchase Order
                </button>
              </div>

              {activeTab === 'new' ? (
                <div>
                  <div className="mb-5">
                    <label className="block text-sm text-gray-800 mb-2">Stock Source*</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSourceType('warehouse')}
                        className={`rounded-lg border px-4 py-3 text-left ${sourceType === 'warehouse' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-700'}`}
                      >
                        <span className="block text-sm font-bold">Warehouse</span>
                        <span className="block text-xs text-gray-500">Show available warehouse stock</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSourceType('vendor')}
                        className={`rounded-lg border px-4 py-3 text-left ${sourceType === 'vendor' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-700'}`}
                      >
                        <span className="block text-sm font-bold">Direct Vendor</span>
                        <span className="block text-xs text-gray-500">Show products supplied by vendor</span>
                      </button>
                    </div>
                  </div>

                  {sourceType === 'vendor' && (
                    <div className="mb-5">
                      <label className="block text-sm text-gray-800 mb-2">Vendors*</label>
                      <select
                        multiple
                        value={selectedVendorIds}
                        onChange={(e) => setSelectedVendorIds(Array.from(e.target.selectedOptions).map((option) => option.value))}
                        className="h-32 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700"
                      >
                        {vendors.map((vendor) => (
                          <option key={vendor.id} value={String(vendor.id)}>
                            {vendor.name}{vendor.company ? ` - ${vendor.company}` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">Ctrl/Shift press karke multiple vendor select kar sakte ho.</p>
                    </div>
                  )}

                  <div className="mb-6">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        if (f && f.size > MAX_INVOICE_UPLOAD_BYTES) {
                          alert(`Invoice file must be ${formatFileSize(MAX_INVOICE_UPLOAD_BYTES)} or smaller.`);
                          e.target.value = '';
                          setSelectedFile(null);
                          return;
                        }
                        setSelectedFile(f);
                      }}
                    />

                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') fileInputRef.current?.click();
                      }}
                      className="rounded-lg border-dashed border-2 border-gray-300 p-6 text-center text-gray-700 cursor-pointer"
                    >
                      <div className="mb-2 font-medium text-gray-800">{selectedFile ? selectedFile.name : 'Upload invoice'}</div>
                      <div className="text-sm text-gray-600">Drop a PDF or image to pre-fill line items</div>
                      <div className="mt-1 text-[11px] text-gray-500">Max size: {formatFileSize(MAX_INVOICE_UPLOAD_BYTES)}</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm text-gray-800 mb-2">Destination*</label>
                    <select
                      className="w-full border border-gray-300 rounded px-3 py-2 text-gray-700"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    >
                      <option value="">Select Destination</option>
                      {loadingStores ? (
                        <option>Loading...</option>
                      ) : (
                        stores.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={applyTaxes} onChange={(e) => setApplyTaxes(e.target.checked)} />
                      <span className="text-sm font-semibold text-gray-800">Apply Taxes On This Transaction</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <label className="block text-sm text-gray-800 mb-2">Purchase order ID</label>
                    <input className="w-full border border-gray-300 rounded px-3 py-2 text-gray-700" placeholder="Enter Purchase order ID" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm text-gray-800 mb-2">Invoice Number</label>
                    <input className="w-full border border-gray-300 rounded px-3 py-2 text-gray-700" placeholder="Enter Invoice Number" />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={applyTaxes} onChange={(e) => setApplyTaxes(e.target.checked)} />
                      <span className="text-sm font-semibold text-gray-800">Apply Taxes On This Transaction</span>
                    </label>
                  </div>
                  <div className="mt-4">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={addProductsPrefill} onChange={(e) => setAddProductsPrefill(e.target.checked)} />
                      <span className="text-sm font-semibold text-gray-800">Add products to cart by default with prefilled quantity.</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center justify-end gap-3 border-t bg-white px-6 py-4">
              <button type="button" className="px-4 py-2 rounded border border-gray-200" onClick={handleClose}>
                Close
              </button>
              <button type="button" className="px-4 py-2 rounded bg-blue-600 text-white" onClick={handleNext} disabled={submitting}>
                {submitting ? '...' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
