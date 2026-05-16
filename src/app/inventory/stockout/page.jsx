"use client";

import { useEffect, useState } from 'react';
import InventoryShell from '@/components/inventory/InventoryShell';
import { getBulkField, parseBulkSheet, pickSpreadsheetFile, toBoolean } from '@/lib/bulkSheet';

async function fetchStores() {
  const res = await fetch('/api/stores');
  if (!res.ok) throw new Error('Failed to fetch stores');
  return res.json();
}

async function fetchStockOutList() {
  const res = await fetch('/api/inventory/stockout');
  if (!res.ok) throw new Error('Failed to fetch stock out records');
  return res.json();
}

async function postStockOut(payload) {
  const res = await fetch('/api/inventory/stockout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create stock out');
  return data;
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
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCost(value) {
  const n = Number(value || 0);
  return `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function mapRecordsToTable(records) {
  return (records || []).map((row) => ({
    'Transaction ID': row.transactionId ? `#${row.transactionId}` : `#STKO-${row.id}`,
    'Invoice Number': row.invoiceNumber || '-',
    Destination: row.destination || 'All',
    'Invoice Date': formatDate(row.invoiceDate),
    'Total Item Number': row.totalItems ?? 0,
    Cost: formatCost(row.cost),
    'Reference Transaction Type': row.referenceType || '-',
    'Reference ID': row.referenceId || '-',
  }));
}

export default function StockOutPage() {
  const [showModal, setShowModal] = useState(false);
  const [lineItemsDraftId, setLineItemsDraftId] = useState(null);
  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [activeTab, setActiveTab] = useState('stock_out');
  const [destination, setDestination] = useState('all');
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [applyTaxes, setApplyTaxes] = useState(true);
  const [addProductsPrefill, setAddProductsPrefill] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const loadList = () => {
    setLoadingList(true);
    fetchStockOutList()
      .then((data) => setTableData(mapRecordsToTable(data)))
      .catch(() => setTableData([]))
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    loadList();
  }, []);

  useEffect(() => {
    if (!showModal) return;
    setLoadingStores(true);
    fetchStores()
      .then((data) => setStores(data || []))
      .catch(() => setStores([]))
      .finally(() => setLoadingStores(false));
  }, [showModal]);

  const handleOpen = () => {
    setActiveTab('stock_out');
    setDestination('all');
    setPurchaseOrderId('');
    setInvoiceNumber('');
    setApplyTaxes(true);
    setAddProductsPrefill(true);
    setShowModal(true);
  };

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
        try {
          const methodRaw = String(getBulkField(row, ['method', 'mode'], 'stock_out')).toLowerCase();
          const method = methodRaw.includes('return') ? 'po_return' : 'stock_out';
          const payload = {
            method,
            destination: method === 'stock_out'
              ? String(getBulkField(row, ['destination_id', 'destination'], 'all'))
              : 'all',
            applyTaxes: toBoolean(getBulkField(row, ['apply_taxes']), true),
            addProductsPrefill: toBoolean(getBulkField(row, ['add_products_prefill']), true),
            purchaseOrderId: getBulkField(row, ['purchase_order_id', 'po_id'], null),
            invoiceNumber: getBulkField(row, ['invoice_number'], null),
          };
          const draft = await postStockOut(payload);
          created.push(draft);
        } catch {
          failed += 1;
        }
      }

      if (!created.length) {
        alert('Could not import any row. Check columns like destination_id, method, invoice_number.');
        return;
      }

      alert(`Bulk import complete: ${created.length} draft(s) created${failed ? `, ${failed} failed` : ''}. Opening the first draft.`);
      setLineItemsDraftId(created[0].id);
    } catch (err) {
      console.error(err);
      alert('Bulk import failed. Please use a valid Excel/CSV file.');
    }
  };

  const handleNext = async () => {
    if (activeTab === 'stock_out' && !destination) {
      return alert('Please select a destination');
    }
    if (activeTab === 'po_return' && !purchaseOrderId.trim() && !invoiceNumber.trim()) {
      return alert('Enter Purchase Order ID or Invoice Number');
    }

    setSubmitting(true);
    try {
      const payload = {
        method: activeTab === 'stock_out' ? 'stock_out' : 'po_return',
        destination: activeTab === 'stock_out' ? destination : 'all',
        applyTaxes,
        addProductsPrefill,
        purchaseOrderId: purchaseOrderId.trim() || null,
        invoiceNumber: invoiceNumber.trim() || null,
      };
      const created = await postStockOut(payload);
      setShowModal(false);
      setLineItemsDraftId(created.id);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to create stock out');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <InventoryShell
        breadcrumb={[{ label: 'Inventory' }, { label: 'Stock Out' }]}
        title="Stock Out"
        subtitle="Stock Out transaction history of last 7 days. Need Help?"
        actions={[
          { label: 'Remove In Bulk (Excel)', onClick: handleBulkImport },
          { label: 'Remove Stock', primary: true, onClick: handleOpen },
        ]}
        searchPlaceholder="Search"
        filters={['Date Range', 'Select Source']}
        tableHeaders={tableHeaders}
        tableData={loadingList ? [] : tableData}
        emptyMessage={loadingList ? 'Loading records...' : 'No Records Found'}
      />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Step 1: Fill Details</h3>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100"
                aria-label="Close"
              >
                <i className="ti ti-x text-[20px]" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('stock_out')}
                  className={`flex-1 rounded-md border px-4 py-2.5 text-[14px] font-medium transition-colors ${
                    activeTab === 'stock_out'
                      ? 'border-blue-300 bg-blue-50 text-gray-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Stock Out
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('po_return')}
                  className={`flex-1 rounded-md border px-4 py-2.5 text-[14px] font-medium transition-colors ${
                    activeTab === 'po_return'
                      ? 'border-blue-300 bg-blue-50 text-gray-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  PO - Return
                </button>
              </div>

              {activeTab === 'stock_out' ? (
                <div>
                  <div className="mb-5">
                    <label className="mb-2 block text-sm text-gray-800">
                      Destination<span className="ml-0.5 text-red-500">*</span>
                    </label>
                    <select
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-700"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    >
                      <option value="all">All</option>
                      {loadingStores ? (
                        <option disabled>Loading...</option>
                      ) : (
                        stores.map((store) => (
                          <option key={store.id} value={store.id}>
                            {store.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={applyTaxes}
                      onChange={(e) => setApplyTaxes(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-sm font-semibold text-gray-800">Apply Taxes On This Transaction</span>
                  </label>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <label className="mb-2 block text-sm text-gray-800">Purchase Order ID</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-700"
                      placeholder="Enter Purchase order ID"
                      value={purchaseOrderId}
                      onChange={(e) => setPurchaseOrderId(e.target.value)}
                    />
                  </div>
                  <div className="mb-2">
                    <label className="mb-2 block text-sm text-gray-800">Invoice Number</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-700"
                      placeholder="Enter Invoice Number"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                    />
                  </div>
                  <p className="mb-5 text-[12px] italic text-gray-500">
                    *Search either by Purchase Order ID or Invoice Number
                  </p>

                  <div className="space-y-4">
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={applyTaxes}
                        onChange={(e) => setApplyTaxes(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                      />
                      <span className="text-sm font-semibold text-gray-800">Apply Taxes On This Transaction</span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        checked={addProductsPrefill}
                        onChange={(e) => setAddProductsPrefill(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                      />
                      <span className="text-sm font-semibold text-gray-800">
                        Add products to cart by default with prefilled quantity.
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                className="rounded-lg border border-blue-500 px-5 py-2 text-[13px] font-medium text-blue-600 transition-colors hover:bg-blue-50"
                onClick={handleClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                onClick={handleNext}
                disabled={submitting}
              >
                {submitting ? '...' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}

      {lineItemsDraftId && (
        <StockOutLineItemsWindow
          id={lineItemsDraftId}
          onClose={() => setLineItemsDraftId(null)}
          onConfirmed={() => {
            setLineItemsDraftId(null);
            loadList();
          }}
        />
      )}
    </>
  );
}

function StockOutLineItemsWindow({ id, onClose, onConfirmed }) {
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cartFilter, setCartFilter] = useState('');
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [cart, setCart] = useState([]);
  const [form, setForm] = useState({
    vendor: '',
    invoice_date: '',
    invoice_number: '',
    purchase_order_id: '',
    other_charges: '',
    remarks: '',
  });
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/inventory/stockout/${encodeURIComponent(id)}`).then((res) => res.json()),
      fetch('/api/vendors').then((res) => res.json()).catch(() => []),
    ])
      .then(([draftData, vendorData]) => {
        setDraft(draftData);
        setVendors(Array.isArray(vendorData) ? vendorData : []);
        if (draftData && !draftData.error) {
          setForm({
            vendor: draftData.vendor_name || '',
            invoice_date: draftData.invoice_date || '',
            invoice_number: draftData.invoice_number || '',
            purchase_order_id: draftData.purchase_order_id || '',
            other_charges: draftData.other_charges ?? '',
            remarks: draftData.remarks || '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setProducts([]);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/catalog/products?search=${encodeURIComponent(searchTerm)}&pageSize=20`)
        .then((res) => res.json())
        .then((res) => {
          const records = res?.data?.records ?? res?.records ?? [];
          setProducts(records);
        })
        .catch(() => setProducts([]));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredCart = cartFilter.trim()
    ? cart.filter((item) => (item.name || '').toLowerCase().includes(cartFilter.toLowerCase()))
    : cart;

  const totals = cart.reduce(
    (acc, item) => {
      const qty = Number(item.qty || 0);
      const cost = Number(item.cost_price || 0);
      acc.totalItems += qty;
      acc.totalCost += qty * cost;
      acc.totalTax += Number(item.tax_value || 0) * qty;
      return acc;
    },
    { totalItems: 0, totalCost: Number(form.other_charges || 0), totalTax: 0 }
  );

  const destinationLabel = draft?.destinationName || 'The Buyzaar Mart';

  const addToCart = (product) => {
    const productId = product.id ?? product.product_id;
    setCart((current) => {
      const existing = current.find((item) => String(item.product_id) === String(productId));
      if (existing) {
        return current.map((item) =>
          String(item.product_id) === String(productId)
            ? { ...item, qty: Number(item.qty) + 1 }
            : item
        );
      }

      const cost = Number(product.cost_price || 0);
      const taxRate = Number(product.tax_rate || 0);
      return [
        ...current,
        {
          product_id: productId,
          name: product.name,
          sku: product.sku,
          cost_price: cost,
          tax_value: draft?.applyTaxes ? (cost * taxRate) / 100 : 0,
          qty: 1,
        },
      ];
    });
    setSearchTerm('');
    setProducts([]);
  };

  const updateQty = (productId, qty) => {
    setCart((current) =>
      current.map((item) =>
        String(item.product_id) === String(productId)
          ? { ...item, qty: Math.max(1, Number(qty) || 1) }
          : item
      )
    );
  };

  const removeItem = (productId) => {
    setCart((current) => current.filter((item) => String(item.product_id) !== String(productId)));
  };

  const confirm = async () => {
    if (cart.length === 0) return alert('Add at least one product');

    setConfirming(true);
    try {
      const res = await fetch(`/api/inventory/stockout/${encodeURIComponent(id)}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form, items: cart }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to confirm stock out');
      onConfirmed();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to confirm stock out');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed bottom-0 right-0 top-[104px] z-[35] bg-[#f1f2f5] md:left-[418px] max-md:left-0">
      <div className="relative h-full overflow-hidden border-t border-gray-200 bg-[#f1f2f5] shadow-[0_-4px_20px_rgba(15,23,42,0.08)]">
        <div className="flex h-12 items-center justify-between border-b border-gray-200 bg-[#f1f2f5] px-9">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-gray-500">Inventory</span>
            <i className="ti ti-chevron-right text-[11px] text-gray-400" />
            <span className="font-semibold text-gray-900">Stock out</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Close line items"
          >
            <i className="ti ti-x text-[18px]" />
          </button>
        </div>

        <div className="absolute bottom-[88px] left-0 right-0 top-12 grid grid-cols-[350px_minmax(520px,1fr)] gap-6 overflow-auto px-9 py-6 max-lg:grid-cols-1 max-lg:px-4">
          <aside className="h-full min-h-0 overflow-auto rounded-lg border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <h3 className="mb-5 text-[15px] font-semibold text-blue-600">Stock Information</h3>

            <div>
              <div className="mb-4">
                <label className="mb-1 block text-[12px] text-gray-500">Destination</label>
                <p className="text-[13px] font-medium text-gray-900">{loading ? '...' : destinationLabel}</p>
              </div>

              <Field label="Vendor Name">
                <div className="relative">
                  <input
                    list="stockout-window-vendor-list"
                    value={form.vendor}
                    onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                    placeholder="Select vendor"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pr-8 text-[13px] text-gray-700 outline-none focus:border-blue-400"
                  />
                  <datalist id="stockout-window-vendor-list">
                    {vendors.map((vendor) => (
                      <option key={vendor.name} value={vendor.name} />
                    ))}
                  </datalist>
                  <i className="ti ti-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-gray-400" />
                </div>
              </Field>

              <div className="mb-4 grid grid-cols-2 gap-3">
                <Field label="Invoice Date">
                  <input
                    type="date"
                    value={form.invoice_date}
                    onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-blue-400"
                  />
                </Field>
                <Field label="Invoice Number">
                  <input
                    value={form.invoice_number}
                    onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                    placeholder="10"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-700 outline-none placeholder:text-gray-400 focus:border-blue-400"
                  />
                </Field>
              </div>

              <Field label="Other Charges">
                <input
                  value={form.other_charges}
                  onChange={(e) => setForm({ ...form, other_charges: e.target.value })}
                  placeholder="Other Charges"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-700 outline-none placeholder:text-gray-400 focus:border-blue-400"
                />
              </Field>

              <Field label="Remarks">
                <textarea
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  placeholder="Remarks"
                  rows={5}
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-700 outline-none placeholder:text-gray-400 focus:border-blue-400"
                />
              </Field>
            </div>
          </aside>

          <main className="flex h-full min-w-0 flex-col">
            <div className="mb-4 flex flex-shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <i className="ti ti-search text-[16px] text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
              />
            </div>

            <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
                <div>
                  <h2 className="text-[14px] font-semibold text-gray-900">Inventory - Stock Out</h2>
                  <p className="mt-0.5 text-[12px] text-gray-500">Select desired products & proceed</p>
                </div>
                <div className="flex min-w-[200px] items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 max-sm:hidden">
                  <input
                    type="text"
                    placeholder="Search"
                    value={cartFilter}
                    onChange={(e) => setCartFilter(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
                  />
                  <i className="ti ti-search text-[15px] text-gray-400" />
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4">
                {searchTerm.trim() && products.length > 0 && (
                  <div className="mb-4 divide-y divide-gray-100 rounded-lg border border-gray-100">
                    {products.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addToCart(product)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-blue-50/60"
                      >
                        <div>
                          <div className="text-[13px] font-medium text-gray-900">{product.name}</div>
                          <div className="text-[12px] text-gray-500">SKU: {product.sku || '-'}</div>
                        </div>
                        <span className="text-[12px] font-medium text-blue-600">Add</span>
                      </button>
                    ))}
                  </div>
                )}

                {searchTerm.trim() && products.length === 0 && !loading && (
                  <p className="py-8 text-center text-[13px] text-gray-500">No products found</p>
                )}

                {filteredCart.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">Product</th>
                        <th className="px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">Qty</th>
                        <th className="px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">Cost</th>
                        <th className="px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">Tax</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCart.map((item) => (
                        <tr key={item.product_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-2 py-3">
                            <div className="text-[13px] font-medium text-gray-900">{item.name}</div>
                            <div className="text-[11px] text-gray-500">{item.sku}</div>
                          </td>
                          <td className="px-2 py-3">
                            <input
                              type="number"
                              min={1}
                              value={item.qty}
                              onChange={(e) => updateQty(item.product_id, e.target.value)}
                              className="w-20 rounded border border-gray-200 px-2 py-1 text-[13px] text-gray-700"
                            />
                          </td>
                          <td className="px-2 py-3 text-[13px] text-gray-700">{formatCurrency(item.cost_price)}</td>
                          <td className="px-2 py-3 text-[13px] text-gray-700">{formatCurrency(item.tax_value)}</td>
                          <td className="px-2 py-3">
                            <button
                              type="button"
                              onClick={() => removeItem(item.product_id)}
                              className="rounded p-1.5 text-red-500 hover:bg-red-50"
                            >
                              <i className="ti ti-trash text-[16px]" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  !searchTerm.trim() && <div className="min-h-[240px]" />
                )}
              </div>
            </section>
          </main>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-[88px] border-t border-gray-200 bg-white shadow-[0_-2px_8px_rgba(15,23,42,0.06)]">
          <div className="flex h-full items-center justify-between px-6 max-md:px-4">
            <div className="flex flex-wrap items-center gap-10">
              <span className="text-[13px] text-gray-600">
                Total Items: <strong className="font-semibold text-gray-900">{totals.totalItems}</strong>
              </span>
              <span className="text-[13px] text-gray-600">
                Total Cost: <strong className="font-semibold text-gray-900">{formatCurrency(totals.totalCost)}</strong>
              </span>
              <span className="text-[13px] text-gray-600">
                Total Tax Value: <strong className="font-semibold text-gray-900">{formatCurrency(totals.totalTax)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={confirm}
                disabled={confirming || cart.length === 0}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {confirming ? 'Confirming...' : 'Confirm Transaction'}
              </button>
              <button
                type="button"
                onClick={() => setCart([])}
                className="rounded-lg border border-gray-200 p-2.5 text-gray-600 transition-colors hover:bg-gray-50"
                title="Clear cart"
              >
                <i className="ti ti-trash text-[18px]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="mb-1 block text-[12px] text-gray-500">{label}</label>
      {children}
    </div>
  );
}
