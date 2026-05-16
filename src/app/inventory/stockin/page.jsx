"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import InventoryShell from '@/components/inventory/InventoryShell';
import { getBulkField, parseBulkSheet, pickSpreadsheetFile, toBoolean } from '@/lib/bulkSheet';

async function fetchStores() {
  const res = await fetch('/api/stores');
  if (!res.ok) throw new Error('Failed to fetch stores');
  return res.json();
}

async function fetchStockInList() {
  const res = await fetch('/api/inventory/stockin');
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

export default function StockInPage() {
  const [showModal, setShowModal] = useState(false);
  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [activeTab, setActiveTab] = useState('new');
  const [destination, setDestination] = useState('');
  const [applyTaxes, setApplyTaxes] = useState(true);
  const [addProductsPrefill, setAddProductsPrefill] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const fileInputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    setLoadingList(true);
    fetchStockInList()
      .then((data) => setTableData(mapRecordsToTable(data)))
      .catch(() => setTableData([]))
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    if (!showModal) return;
    setLoadingStores(true);
    fetchStores()
      .then((data) => setStores(data || []))
      .catch(() => setStores([]))
      .finally(() => setLoadingStores(false));
  }, [showModal]);

  const handleOpen = () => setShowModal(true);
  const handleClose = () => setShowModal(false);

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
      fetchStockInList()
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
    setSubmitting(true);
    try {
      const payload = {
        method: activeTab === 'new' ? 'new' : 'purchase_order',
        destination,
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
        filters={['Date Range', 'Select Source']}
        tableHeaders={tableHeaders}
        tableData={loadingList ? [] : tableData}
        emptyMessage={loadingList ? 'Loading records…' : 'No Records Found'}
      />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
          <div className="relative bg-white w-full max-w-2xl rounded-md shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Step 1 : Stock In Method</h3>
            </div>
            <div className="p-6">
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
                  <div className="mb-6">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
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
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
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
