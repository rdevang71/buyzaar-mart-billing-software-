"use client";

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';

function formatCurrency(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generateBatchNo() {
  return `AUTO-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function createBatchRow(qty = 1) {
  return {
    batch_id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    batch_no: generateBatchNo(),
    qty,
    expiry_date: '',
  };
}

function sumBatchQty(batches = []) {
  return batches.reduce((sum, batch) => sum + Number(batch.qty || 0), 0);
}

function LineItemsContent() {
  const search = useSearchParams();
  const router = useRouter();
  const id = search.get('id');

  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cartFilter, setCartFilter] = useState('');
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [cart, setCart] = useState([]);
  const [form, setForm] = useState({
    vendor: '',
    invoice_date: '',
    invoice_number: '',
    other_charges: '',
    remarks: '',
  });
  const [confirming, setConfirming] = useState(false);
  const isStoreDestination = String(draft?.destinationLocationType || '').toLowerCase() === 'store';
  const isWarehouseDestination = String(draft?.destinationLocationType || 'Warehouse').toLowerCase() === 'warehouse';
  const sourceType = String(draft?.meta?.sourceType || 'warehouse').toLowerCase();
  const allowFullWarehouseTransfer = sourceType === 'warehouse' && isStoreDestination;

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/inventory/stockin/${encodeURIComponent(id)}`).then((r) => r.json()),
      fetch('/api/vendors').then((r) => r.json()),
    ])
      .then(([d, v]) => {
        setDraft(d);
        setVendors(Array.isArray(v) ? v : []);
        if (d && !d.error) {
          setForm({
            vendor: d.vendor_name || (Array.isArray(d.meta?.vendorNames) ? d.meta.vendorNames.join(', ') : ''),
            invoice_date: d.invoice_date || '',
            invoice_number: d.invoice_number || '',
            other_charges: d.other_charges ?? '',
            remarks: d.remarks || '',
          });
          setSelectedVendorIds((Array.isArray(d.meta?.vendorIds) ? d.meta.vendorIds : []).map(String));
          if (Array.isArray(d.items) && d.items.length) {
            const warehouseDestination = String(d.destinationLocationType || 'Warehouse').toLowerCase() === 'warehouse';
            setCart(d.items.map((item) => ({
              line_id: `${item.product_id}-${item.id || Date.now()}`,
              product_id: item.product_id,
              name: item.name,
              sku: item.sku,
              cost_price: Number(item.cost_price || 0),
              tax_value: Number(item.tax_value || 0),
              qty: Number(item.qty || 1),
              max_qty: null,
              batches: warehouseDestination
                ? [createBatchRow(Number(item.qty || 1))]
                : [],
              batch_no: item.batch_no || generateBatchNo(),
              expiry_date: item.expiry_date || '',
            })));
          }
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();

    const loadProducts = async () => {
      if (!draft) return;
      setLoadingProducts(true);
      try {
        const params = new URLSearchParams({ pageSize: '30' });
        if (searchTerm.trim()) params.set('search', searchTerm.trim());
        const sourceType = String(draft?.meta?.sourceType || 'warehouse').toLowerCase();
        const endpoint = '/api/inventory/stockin/source-products';
        params.set('source', sourceType === 'vendor' ? 'vendor' : 'warehouse');
        params.set('destinationType', String(draft?.destinationLocationType || '').toLowerCase());
        if (sourceType === 'vendor') {
          params.set('vendorIds', selectedVendorIds.join(','));
        }

        const response = await fetch(`${endpoint}?${params.toString()}`, {
          signal: controller.signal,
        });
        const res = await response.json();
        const records = res?.data?.records ?? res?.records ?? [];
        setProducts(Array.isArray(records) ? records : []);
      } catch (error) {
        if (error?.name !== 'AbortError') setProducts([]);
      } finally {
        if (!controller.signal.aborted) setLoadingProducts(false);
      }
    };

    const t = setTimeout(loadProducts, searchTerm.trim() ? 250 : 0);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [searchTerm, draft, selectedVendorIds]);

  const filteredCart = useMemo(() => {
    if (!cartFilter.trim()) return cart;
    const q = cartFilter.toLowerCase();
    return cart.filter((it) => (it.name || '').toLowerCase().includes(q));
  }, [cart, cartFilter]);

  const totals = useMemo(() => {
    let totalItems = 0;
    let totalCost = Number(form.other_charges || 0);
    let totalTax = 0;
    for (const it of cart) {
      const qty = Number(it.qty || 0);
      const cost = Number(it.cost_price || 0);
      totalItems += qty;
      totalCost += qty * cost;
      totalTax += Number(it.tax_value || 0) * qty;
    }
    return { totalItems, totalCost, totalTax };
  }, [cart, form.other_charges]);

  const addToCart = (p) => {
    const pid = p.id ?? p.product_id;
    const availableStock = Number(p.availableStock ?? p.available_stock ?? 0);
    const selectedQty = cart
      .filter((item) => String(item.product_id) === String(pid))
      .reduce((sum, item) => sum + Number(item.qty || 0), 0);

    const sourceType = String(draft?.meta?.sourceType || 'warehouse').toLowerCase();
    if (!allowFullWarehouseTransfer && sourceType === 'warehouse' && isStoreDestination && selectedQty >= availableStock) {
      alert(`${p.name} has only ${availableStock} quantity available in warehouse`);
      return;
    }

    setCart((c) => {
      const taxRate = Number(p.tax_rate ?? p.taxRate ?? 0);
      const cost = Number(p.cost_price || 0);
      const remainingQty = sourceType === 'warehouse' && isStoreDestination ? Math.max(0, availableStock - selectedQty) : 1;
      return [
        ...c,
        {
          line_id: `${pid}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          product_id: pid,
          name: p.name,
          sku: p.sku,
          cost_price: cost,
          tax_value: draft?.applyTaxes ? (cost * taxRate) / 100 : 0,
          qty: 1,
          max_qty: allowFullWarehouseTransfer ? null : (sourceType === 'warehouse' && isStoreDestination ? availableStock : null),
          batches: sourceType === 'warehouse' && isStoreDestination ? [] : [createBatchRow(1)],
          batch_no: generateBatchNo(),
          expiry_date: '',
        },
      ];
    });
    setSearchTerm('');
    setProducts([]);
  };

  const updateCartItem = (lineId, updates) => {
    setCart((c) => c.map((it) => (it.line_id === lineId ? { ...it, ...updates } : it)));
  };

  const updateBatchRow = (lineId, batchId, updates) => {
    setCart((c) =>
      c.map((it) => {
        if (it.line_id !== lineId) return it;
        const batches = (it.batches || []).map((batch) =>
          batch.batch_id === batchId ? { ...batch, ...updates } : batch
        );
        return { ...it, batches, qty: Math.max(0, sumBatchQty(batches)) };
      })
    );
  };

  const addBatchRow = (lineId) => {
    setCart((c) =>
      c.map((it) => {
        if (it.line_id !== lineId) return it;
        const batches = [...(it.batches || []), createBatchRow(1)];
        return { ...it, batches, qty: Math.max(0, sumBatchQty(batches)) };
      })
    );
  };

  const removeBatchRow = (lineId, batchId) => {
    setCart((c) =>
      c.map((it) => {
        if (it.line_id !== lineId) return it;
        const batches = (it.batches || []).filter((batch) => batch.batch_id !== batchId);
        return { ...it, batches, qty: Math.max(0, sumBatchQty(batches)) };
      })
    );
  };

  const updateQty = (lineId, qty) => {
    setCart((c) =>
      c.map((it) => {
        if (it.line_id !== lineId) return it;
        const requestedQty = Math.max(1, Number(qty) || 1);
        if (isWarehouseDestination) {
          const batches = it.batches?.length ? it.batches : [createBatchRow(requestedQty)];
          const nextBatches = batches.map((batch, index) => index === 0 ? { ...batch, qty: requestedQty } : batch);
          return { ...it, batches: nextBatches, qty: Math.max(0, sumBatchQty(nextBatches)) };
        }
        if (allowFullWarehouseTransfer) return { ...it, qty: requestedQty };
        if (String(draft?.meta?.sourceType || 'warehouse').toLowerCase() !== 'warehouse' || !isStoreDestination || !it.max_qty) return { ...it, qty: requestedQty };

        const otherSelectedQty = c
          .filter((item) => item.line_id !== lineId && String(item.product_id) === String(it.product_id))
          .reduce((sum, item) => sum + Number(item.qty || 0), 0);
        const allowedQty = Math.max(1, Number(it.max_qty || 0) - otherSelectedQty);
        if (requestedQty > allowedQty) {
          alert(`${it.name} has only ${it.max_qty} quantity available in warehouse`);
        }
        return { ...it, qty: Math.min(requestedQty, allowedQty) };
      })
    );
  };

  const removeItem = (lineId) => {
    setCart((c) => c.filter((it) => it.line_id !== lineId));
  };

  const confirm = async () => {
    if (!id) return alert('Missing stock in id');
    if (cart.length === 0) return alert('Add at least one product');
    if (isWarehouseDestination) {
      const invalidItem = cart.find((item) => !item.batches?.length || sumBatchQty(item.batches) <= 0);
      if (invalidItem) return alert(`Add batch quantity for ${invalidItem.name}`);
    }
    setConfirming(true);
    try {
      const res = await fetch(`/api/inventory/stockin/${encodeURIComponent(id)}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form: { ...form, vendorIds: selectedVendorIds, sourceType }, items: cart }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      router.push('/inventory/stockin');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to confirm');
    } finally {
      setConfirming(false);
    }
  };

  if (!id) {
    return (
      <MainLayout>
        <div className="text-gray-600">Missing stock in id. Go back and start a new stock in.</div>
      </MainLayout>
    );
  }

  const destinationLabel = draft?.destinationName || '—';

  return (
    <MainLayout>
      <div className="flex items-center gap-2 text-[12px] text-gray-500 mb-4">
        <span className="text-blue-600">Inventory</span>
        <i className="ti ti-chevron-right text-[11px] text-gray-400" />
        <span className="font-semibold text-gray-900">Stock in – line items</span>
      </div>

      <div className="flex gap-5 pb-28">
        <div className="w-[280px] flex-shrink-0 bg-white rounded-lg border border-gray-200 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <h3 className="text-[15px] font-semibold text-blue-600 mb-5">Stock Information</h3>

          <div className="mb-4">
            <label className="block text-[12px] text-gray-500 mb-1">Destination</label>
            <p className="text-[13px] font-medium text-gray-900">{loading ? '…' : destinationLabel}</p>
          </div>

          <div className="mb-4">
            <label className="block text-[12px] text-gray-500 mb-1">Stock Source</label>
            <p className="text-[13px] font-semibold text-gray-900">{sourceType === 'vendor' ? 'Direct Vendor' : 'Warehouse'}</p>
          </div>

          <div className="mb-4">
            <label className="block text-[12px] text-gray-500 mb-1">Vendor Name</label>
            {sourceType === 'vendor' ? (
              <select
                multiple
                value={selectedVendorIds}
                onChange={(e) => {
                  const ids = Array.from(e.target.selectedOptions).map((option) => option.value);
                  setSelectedVendorIds(ids);
                  const names = vendors.filter((vendor) => ids.includes(String(vendor.id))).map((vendor) => vendor.name);
                  setForm({ ...form, vendor: names.join(', ') });
                }}
                className="h-28 w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-700 bg-white outline-none focus:border-blue-400"
              >
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={String(vendor.id)}>
                    {vendor.name}{vendor.company ? ` - ${vendor.company}` : ''}
                  </option>
                ))}
              </select>
            ) : (
            <div className="relative">
              <input
                list="vendor-list"
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                placeholder="Select vendor"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-8 text-[13px] text-gray-700 bg-white outline-none focus:border-blue-400"
              />
              <datalist id="vendor-list">
                {vendors.map((v) => (
                  <option key={v.name} value={v.name} />
                ))}
              </datalist>
              <i className="ti ti-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[14px] pointer-events-none" />
            </div>
            )}
          </div>

          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-[12px] text-gray-500 mb-1">Invoice Date</label>
              <input
                type="date"
                value={form.invoice_date}
                onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-blue-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[12px] text-gray-500 mb-1">Invoice Number</label>
              <input
                value={form.invoice_number}
                onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                placeholder="10"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[12px] text-gray-500 mb-1">Other Charges</label>
            <input
              value={form.other_charges}
              onChange={(e) => setForm({ ...form, other_charges: e.target.value })}
              placeholder="Other Charges"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block text-[12px] text-gray-500 mb-1">Remarks</label>
            <textarea
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Remarks"
              rows={5}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-blue-400 resize-none"
            />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2.5 mb-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <i className="ti ti-search text-gray-400 text-[16px]" />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-[0_1px_2px_rgba(15,23,42,0.03)] min-h-[calc(100vh-220px)] flex flex-col">
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-[14px] font-semibold text-gray-900">Inventory - Stock In</h2>
                <p className="text-[12px] text-gray-500 mt-0.5">Select desired products & proceed</p>
              </div>
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Search"
                  value={cartFilter}
                  onChange={(e) => setCartFilter(e.target.value)}
                  className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
                />
                <i className="ti ti-search text-gray-400 text-[15px]" />
              </div>
            </div>

            <div className="flex-1 p-4 overflow-auto">
              {products.length > 0 && (
                <div className="mb-4 border border-gray-100 rounded-lg divide-y divide-gray-100">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addToCart(p)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-blue-50/60 transition-colors"
                    >
                      <div>
                        <div className="text-[13px] font-medium text-gray-900">{p.name}</div>
                        {sourceType === 'warehouse' && isStoreDestination && (
                          <div className="text-[11px] text-emerald-600 mt-0.5">
                            Warehouse qty: {Number(p.availableStock || 0)}
                          </div>
                        )}
                        {sourceType === 'vendor' && p.vendor_names && (
                          <div className="text-[11px] text-blue-600 mt-0.5">
                            Vendor: {p.vendor_names}
                          </div>
                        )}
                        <div className="text-[12px] text-gray-500">SKU: {p.sku || '—'}</div>
                      </div>
                      <span className="text-[12px] font-medium text-blue-600">Add</span>
                    </button>
                  ))}
                </div>
              )}

              {!loadingProducts && products.length === 0 && (
                <p className="text-[13px] text-gray-500 text-center py-8">No products found</p>
              )}

              {filteredCart.length > 0 ? (
                isWarehouseDestination ? (
                  <div className="space-y-3">
                    {filteredCart.map((it) => (
                      <div key={it.line_id} className="rounded-lg border border-gray-200 bg-white">
                        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-4 py-3">
                          <div className="min-w-0">
                            <div className="text-[14px] font-semibold text-gray-900">{it.name}</div>
                            <div className="mt-0.5 text-[12px] text-gray-500">SKU: {it.sku || '—'}</div>
                          </div>
                          <div className="flex items-center gap-6 text-right">
                            <div>
                              <div className="text-[11px] font-semibold uppercase text-gray-400">Total Qty</div>
                              <div className="text-[15px] font-semibold text-gray-900">{Number(it.qty || 0)}</div>
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold uppercase text-gray-400">Cost</div>
                              <div className="text-[13px] font-medium text-gray-700">{formatCurrency(it.cost_price)}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(it.line_id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded"
                              title="Remove product"
                            >
                              <i className="ti ti-trash text-[17px]" />
                            </button>
                          </div>
                        </div>

                        <div className="px-4 py-3">
                          <div className="grid grid-cols-[1.1fr_110px_150px_40px] gap-3 px-1 pb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                            <span>Batch No</span>
                            <span>Qty</span>
                            <span>Expiry Date</span>
                            <span />
                          </div>

                          <div className="space-y-2">
                            {(it.batches || []).map((batch, index) => (
                                <div key={batch.batch_id} className="grid grid-cols-[1.1fr_110px_150px_40px] gap-3 items-center">
                                  <div className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] font-medium text-gray-700 flex items-center">
                                    {batch.batch_no || `Batch ${index + 1}`}
                                  </div>
                                <input
                                  type="number"
                                  min={0}
                                  value={batch.qty}
                                  onChange={(e) => updateBatchRow(it.line_id, batch.batch_id, { qty: e.target.value })}
                                  placeholder="Qty"
                                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-[13px] text-gray-800 outline-none focus:border-blue-400"
                                />
                                <input
                                  type="date"
                                  value={batch.expiry_date}
                                  onChange={(e) => updateBatchRow(it.line_id, batch.batch_id, { expiry_date: e.target.value })}
                                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-[13px] text-gray-800 outline-none focus:border-blue-400"
                                  title="Expiry date"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeBatchRow(it.line_id, batch.batch_id)}
                                  disabled={(it.batches || []).length <= 1}
                                  className="h-10 w-10 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                  title="Remove batch"
                                >
                                  <i className="ti ti-x text-[16px]" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                            <button
                              type="button"
                              onClick={() => addBatchRow(it.line_id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              <i className="ti ti-plus text-[14px]" />
                              Add batch
                            </button>
                            <div className="text-[12px] text-gray-500">
                              {it.batches?.length || 0} batch{it.batches?.length === 1 ? '' : 'es'} added
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wide py-2 px-2">Product</th>
                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wide py-2 px-2">Qty</th>
                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wide py-2 px-2">Batch</th>
                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wide py-2 px-2">Expiry</th>
                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wide py-2 px-2">Cost</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCart.map((it) => (
                        <tr key={it.line_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="py-3 px-2">
                            <div className="text-[13px] font-medium text-gray-900">{it.name}</div>
                            <div className="text-[11px] text-gray-500">{it.sku}</div>
                          </td>
                          <td className="py-3 px-2">
                            <input
                              type="number"
                              min={1}
                              max={allowFullWarehouseTransfer ? undefined : (it.max_qty || undefined)}
                              value={it.qty}
                              onChange={(e) => updateQty(it.line_id, e.target.value)}
                              className="w-20 border border-gray-200 rounded px-2 py-1 text-[13px] text-gray-700"
                            />
                            {!allowFullWarehouseTransfer && sourceType === 'warehouse' && isStoreDestination && it.max_qty ? (
                              <div className="mt-1 text-[10px] text-gray-500">Max {it.max_qty}</div>
                            ) : null}
                          </td>
                          <td className="py-3 px-2 text-[12px] text-gray-500">{sourceType === 'vendor' ? 'Vendor batch' : 'Auto from warehouse'}</td>
                          <td className="py-3 px-2 text-[12px] text-gray-500">{sourceType === 'vendor' ? 'As invoiced' : 'FEFO'}</td>
                          <td className="py-3 px-2 text-[13px] text-gray-700">{formatCurrency(it.cost_price)}</td>
                          <td className="py-3 px-2">
                            <button
                              type="button"
                              onClick={() => removeItem(it.line_id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                            >
                              <i className="ti ti-trash text-[16px]" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : (
                !searchTerm.trim() && <div className="min-h-[400px]" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed left-[218px] right-0 bottom-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(15,23,42,0.06)] max-md:left-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-10 flex-wrap">
            <span className="text-[13px] text-gray-600">
              Total Items: <strong className="text-gray-900 font-semibold">{totals.totalItems}</strong>
            </span>
            <span className="text-[13px] text-gray-600">
              Total Cost: <strong className="text-gray-900 font-semibold">{formatCurrency(totals.totalCost)}</strong>
            </span>
            <span className="text-[13px] text-gray-600">
              Total Tax Value: <strong className="text-gray-900 font-semibold">{formatCurrency(totals.totalTax)}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCart([])}
              className="p-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              title="Clear cart"
            >
              <i className="ti ti-trash text-[18px]" />
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={confirming || cart.length === 0}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-[13px] font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {confirming ? 'Confirming…' : 'Confirm Transaction'}
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default function StockInLineItemsPage() {
  return (
    <Suspense fallback={<MainLayout><div className="text-gray-500 p-4">Loading…</div></MainLayout>}>
      <LineItemsContent />
    </Suspense>
  );
}
