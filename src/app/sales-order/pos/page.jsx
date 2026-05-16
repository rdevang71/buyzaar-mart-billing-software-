'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import MainLayout from '@/components/MainLayout';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function emptyPayment() {
  return { method: 'cash', amount: '', referenceNo: '' };
}

export default function PosBillingPage() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [recentBills, setRecentBills] = useState([]);
  const [search, setSearch] = useState('');
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [openingSession, setOpeningSession] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [closingLoading, setClosingLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [orderDiscount, setOrderDiscount] = useState('0');
  const [roundOff, setRoundOff] = useState('0');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [payments, setPayments] = useState([emptyPayment()]);
  const [openingCash, setOpeningCash] = useState('0');
  const [actualCash, setActualCash] = useState('0');
  const [closingRemarks, setClosingRemarks] = useState('');
  const [openingStoreId, setOpeningStoreId] = useState('');
  const [openSessionVisible, setOpenSessionVisible] = useState(false);
  const [closeSessionVisible, setCloseSessionVisible] = useState(false);
  const [closingSummary, setClosingSummary] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async (query = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '48' });
      if (query) params.set('search', query);
      const res = await fetch(`/api/sales-order/pos?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setProducts(json.data.products || []);
        setRecentBills(json.data.recentBills || []);
        setSession(json.data.session || null);
        setStores(json.data.stores || []);
        if (!openingStoreId && json.data.session?.storeId) {
          setOpeningStoreId(String(json.data.session.storeId));
        }
      } else {
        showToast(json.message || 'Failed to load POS data', 'error');
      }
    } catch {
      showToast('Network error while loading POS data', 'error');
    } finally {
      setLoading(false);
    }
  }, [openingStoreId]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setUser(json.data.user);
          if (!openingStoreId) setOpeningStoreId('1');
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadData(search);
  }, [loadData, search]);

  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
    const lineDiscount = cart.reduce((sum, item) => sum + toNumber(item.discountAmount), 0);
    const taxTotal = cart.reduce((sum, item) => {
      const taxable = Math.max(0, (item.qty * item.sellingPrice) - toNumber(item.discountAmount));
      return sum + (taxable * toNumber(item.taxRate) / 100);
    }, 0);
    const discount = toNumber(orderDiscount) + lineDiscount;
    const roundValue = toNumber(roundOff);
    const grandTotal = Math.max(0, subtotal - discount + taxTotal + roundValue);
    return { subtotal, lineDiscount, taxTotal, discount, roundValue, grandTotal };
  }, [cart, orderDiscount, roundOff]);

  const addProduct = (product) => {
    if (toNumber(product.availableStock) <= 0) {
      showToast('No stock available', 'error');
      return;
    }

    // Determine selling price: prefer system selling_price, otherwise fallback to MRP
    const sellingPrice = product.selling_price || product.sellingPrice || product.mrp || product.mrp || 0;
    // Compute discount amount if selling price is less than MRP
    const mrp = product.mrp || 0;
    const discountAmountForOne = Math.max(0, (mrp - sellingPrice));

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) => (
          item.id === product.id
            ? { ...item, qty: Math.min(item.qty + 1, toNumber(product.availableStock)) }
            : item
        ));
      }

      return [...current, { ...product, qty: 1, discountAmount: discountAmountForOne, sellingPrice }];
    });
  };

  const handleBarcode = async (value) => {
    const code = value?.trim();
    if (!code) return;

    // try to find in loaded products first
    const local = products.find((p) => (p.barcode && String(p.barcode) === code) || (p.sku && String(p.sku) === code) || String(p.id) === code);
    if (local) {
      addProduct(local);
      setBarcode('');
      return;
    }

    // fallback: fetch product by search API
    try {
      const res = await fetch(`/api/catalog/products?search=${encodeURIComponent(code)}&pageSize=1`);
      const json = await res.json();
      if (json.success && json.data.records && json.data.records.length > 0) {
        addProduct(json.data.records[0]);
      } else {
        showToast('Product not found for barcode', 'error');
      }
    } catch {
      showToast('Failed to lookup barcode', 'error');
    } finally {
      setBarcode('');
    }
  };

  const updateCartItem = (id, field, value) => {
    setCart((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeCartItem = (id) => {
    setCart((current) => current.filter((item) => item.id !== id));
  };

  const openSession = async () => {
    if (!user) {
      showToast('Login first', 'error');
      return;
    }

    if (!openingStoreId) {
      showToast('Select a store', 'error');
      return;
    }

    setOpeningSession(true);
    try {
      const res = await fetch('/api/employee/user-counter-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          storeId: Number(openingStoreId),
          openingCash: toNumber(openingCash),
          counterName: 'Front Counter',
        }),
      });
      const json = await res.json();
      if (res.ok || json.id) {
        showToast('Cashier session opened');
        setSession(json);
        setOpenSessionVisible(false);
        loadData(search);
      } else {
        showToast(json.error || 'Failed to open session', 'error');
      }
    } catch {
      showToast('Failed to open session', 'error');
    } finally {
      setOpeningSession(false);
    }
  };

  const checkout = async () => {
    if (!session?.sessionId) {
      showToast('Open a cashier session first', 'error');
      return;
    }

    if (cart.length === 0) {
      showToast('Add products to cart', 'error');
      return;
    }

    setCheckoutLoading(true);
    try {
      const paymentRows = paymentMode === 'split'
        ? payments.filter((payment) => toNumber(payment.amount) > 0)
        : [{ method: paymentMode, amount: cartTotals.grandTotal, referenceNo: '' }];

      const res = await fetch('/api/sales-order/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          userId: user?.id,
          storeId: session.storeId || Number(openingStoreId),
          counterId: session.counterId,
          customerName,
          customerMobile,
          orderDiscount: toNumber(orderDiscount),
          roundOff: toNumber(roundOff),
          paymentMode,
          payments: paymentRows,
          items: cart.map((item) => ({
            id: item.id,
            productId: item.id,
            qty: item.qty,
            sellingPrice: item.sellingPrice,
            mrp: item.mrp,
            taxRate: item.taxRate,
            discountAmount: toNumber(item.discountAmount),
          })),
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Bill ${json.data.bill.billNumber} created`);
        setCart([]);
        setCustomerName('');
        setCustomerMobile('');
        setOrderDiscount('0');
        setRoundOff('0');
        setPayments([emptyPayment()]);
        setPaymentMode('cash');
        loadData(search);
      } else {
        showToast(json.message || 'Checkout failed', 'error');
      }
    } catch {
      showToast('Checkout failed', 'error');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const loadClosingSummary = async () => {
    if (!session?.sessionId) return;
    const res = await fetch('/api/sales-order/closing');
    const json = await res.json();
    if (json.success) {
      setClosingSummary(json.data);
      setActualCash(String((json.data.session?.openingCash || 0) + (json.data.totals?.cashSales || 0)));
    }
  };

  const closeSession = async () => {
    if (!session?.sessionId) {
      showToast('No active session', 'error');
      return;
    }

    setClosingLoading(true);
    try {
      const res = await fetch('/api/sales-order/closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          openingCash: toNumber(closingSummary?.session?.openingCash ?? session?.meta?.opening_cash ?? openingCash),
          actualCash: toNumber(actualCash),
          remarks: closingRemarks,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Session closed successfully');
        setCloseSessionVisible(false);
        setSession(null);
        setClosingRemarks('');
        setActualCash('0');
        loadData(search);
      } else {
        showToast(json.message || 'Failed to close session', 'error');
      }
    } catch {
      showToast('Failed to close session', 'error');
    } finally {
      setClosingLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-100 text-slate-800">
        {toast && (
          <div className={`fixed top-4 right-4 z-[999] px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
            toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
          }`}>
            {toast.msg}
          </div>
        )}

        <div className="p-4 md:p-6 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs text-blue-600 font-medium">Sales Order</p>
              <h1 className="text-2xl font-bold text-slate-900">POS Billing</h1>
              <p className="text-sm text-slate-500">Fast checkout, live stock check, daily closing and reconciliation.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setOpenSessionVisible(true)} className="px-4 py-2 rounded-lg border border-blue-200 bg-white text-blue-700 font-semibold hover:bg-blue-50">
                {session?.sessionId ? 'Open Session Info' : 'Open Session'}
              </button>
              <button onClick={async () => { await loadClosingSummary(); setCloseSessionVisible(true); }} className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50">
                Daily Closing
              </button>
              <button onClick={checkout} disabled={checkoutLoading || cart.length === 0 || !session?.sessionId} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-60 hover:bg-blue-700">
                {checkoutLoading ? 'Processing...' : 'Charge Bill'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)] gap-4">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">Products</h2>
                  <p className="text-xs text-slate-500">Search by name, barcode, or SKU.</p>
                </div>
                <div className="flex gap-2 w-full lg:w-72">
                  <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500" />
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleBarcode(barcode); }}
                    placeholder="Scan barcode"
                    className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3 max-h-[calc(100vh-230px)] overflow-auto">
                {loading ? (
                  <div className="col-span-full py-16 text-center text-slate-400">Loading products...</div>
                ) : products.length === 0 ? (
                  <div className="col-span-full py-16 text-center text-slate-400">No products found</div>
                ) : products.map((product) => (
                  <button key={product.id} onClick={() => addProduct(product)} className="text-left rounded-xl border border-slate-200 p-3 hover:border-blue-300 hover:shadow-sm transition bg-slate-50/50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900 leading-snug">{product.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{product.sku || 'No SKU'} • {product.barcode || 'No barcode'}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${product.availableStock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>Stock {toNumber(product.availableStock)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-slate-500">Price</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(product.sellingPrice || product.mrp)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                      <span>{product.brandName || 'No brand'}</span>
                      <span>{product.categoryName || 'No category'}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <aside className="space-y-4">
              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h2 className="font-semibold text-slate-900">Cashier Session</h2>
                    <p className="text-xs text-slate-500">{session?.sessionId ? `Session ${session.sessionId}` : 'No active session'}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${session?.sessionId ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{session?.sessionId ? 'Active' : 'Closed'}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Cashier</p><p className="font-semibold text-slate-900">{session?.userName || user?.name || '—'}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Store</p><p className="font-semibold text-slate-900">{session?.storeName || '—'}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Opening Cash</p><p className="font-semibold text-slate-900">{formatCurrency(session?.meta?.opening_cash || 0)}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Orders</p><p className="font-semibold text-slate-900">{recentBills.length}</p></div>
                </div>
              </section>

              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-slate-900">Cart</h2>
                  <span className="text-xs text-slate-500">{cart.length} items</span>
                </div>
                {cart.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-slate-400 text-sm">Add products to start billing.</div>
                ) : (
                  <div className="space-y-3 max-h-[320px] overflow-auto pr-1">
                    {cart.map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-500">Stock {toNumber(item.availableStock)}</p>
                          </div>
                          <button onClick={() => removeCartItem(item.id)} className="text-rose-600 text-xs font-semibold">Remove</button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                          <label className="block">
                            Qty
                            <input type="number" min="1" max={toNumber(item.availableStock)} value={item.qty} onChange={(event) => updateCartItem(item.id, 'qty', toNumber(event.target.value, 1))} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                          </label>
                          <label className="block">
                            Discount
                            <input type="number" min="0" value={item.discountAmount} onChange={(event) => updateCartItem(item.id, 'discountAmount', toNumber(event.target.value, 0))} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                          </label>
                          <div className="rounded-lg bg-slate-50 px-2 py-1.5"><p className="text-slate-500">Line</p><p className="font-semibold text-slate-900">{formatCurrency((item.qty * item.sellingPrice) - toNumber(item.discountAmount))}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-medium">{formatCurrency(cartTotals.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Discount</span><span className="font-medium">{formatCurrency(cartTotals.discount)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Tax</span><span className="font-medium">{formatCurrency(cartTotals.taxTotal)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Round off</span><span className="font-medium">{formatCurrency(cartTotals.roundValue)}</span></div>
                  <div className="flex justify-between pt-2 border-t border-slate-100 text-base"><span className="font-semibold text-slate-900">Grand Total</span><span className="font-bold text-blue-700">{formatCurrency(cartTotals.grandTotal)}</span></div>
                </div>
              </section>

              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
                <h2 className="font-semibold text-slate-900">Payment</h2>
                <div className="grid grid-cols-1 gap-3">
                  <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  <input value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} placeholder="Customer mobile" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"><option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option><option value="split">Split</option></select>
                  {paymentMode === 'split' ? (
                    <div className="space-y-2">
                      {payments.map((payment, index) => (
                        <div key={index} className="grid grid-cols-3 gap-2">
                          <select value={payment.method} onChange={(e) => setPayments((current) => current.map((entry, idx) => idx === index ? { ...entry, method: e.target.value } : entry))} className="rounded-lg border border-slate-200 px-2 py-2 text-sm bg-white"><option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option></select>
                          <input type="number" value={payment.amount} onChange={(e) => setPayments((current) => current.map((entry, idx) => idx === index ? { ...entry, amount: e.target.value } : entry))} placeholder="Amount" className="rounded-lg border border-slate-200 px-2 py-2 text-sm" />
                          <input value={payment.referenceNo} onChange={(e) => setPayments((current) => current.map((entry, idx) => idx === index ? { ...entry, referenceNo: e.target.value } : entry))} placeholder="Ref" className="rounded-lg border border-slate-200 px-2 py-2 text-sm" />
                        </div>
                      ))}
                      <button type="button" onClick={() => setPayments((current) => [...current, emptyPayment()])} className="text-blue-700 text-sm font-semibold">+ Add payment line</button>
                    </div>
                  ) : null}
                  <input value={orderDiscount} onChange={(e) => setOrderDiscount(e.target.value)} placeholder="Order discount" type="number" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  <input value={roundOff} onChange={(e) => setRoundOff(e.target.value)} placeholder="Round off" type="number" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
              </section>
            </aside>
          </div>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3"><h2 className="font-semibold text-slate-900">Recent Bills</h2><span className="text-xs text-slate-500">Realtime from DB</span></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm"><thead><tr className="text-left text-slate-500 border-b border-slate-100"><th className="py-2">Bill</th><th className="py-2">Customer</th><th className="py-2">Amount</th><th className="py-2">Mode</th><th className="py-2">Status</th></tr></thead><tbody>{recentBills.length === 0 ? (<tr><td colSpan={5} className="py-6 text-slate-400">No bills yet</td></tr>) : recentBills.map((bill) => (<tr key={bill.id} className="border-b border-slate-50"><td className="py-2 font-medium text-slate-900">{bill.billNumber}</td><td className="py-2">{bill.customerName || 'Walk-in'}</td><td className="py-2">{formatCurrency(bill.grandTotal)}</td><td className="py-2">{bill.paymentMode}</td><td className="py-2">{bill.status}</td></tr>))}</tbody></table>
            </div>
          </section>
        </div>

        {openSessionVisible && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Open Cashier Session</h3>
              <p className="text-sm text-slate-500 mb-4">A cashier session is required before billing can start.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select value={openingStoreId} onChange={(e) => setOpeningStoreId(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white md:col-span-2"><option value="">Select store</option>{stores.map((store) => (<option key={store.id} value={store.id}>{store.name}</option>))}</select>
                <input value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} type="number" placeholder="Opening cash" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input value="Front Counter" disabled className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-slate-50" />
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setOpenSessionVisible(false)} className="px-4 py-2 rounded-lg border border-slate-200 bg-white">Cancel</button>
                <button onClick={openSession} disabled={openingSession} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-60">{openingSession ? 'Opening...' : 'Open Session'}</button>
              </div>
            </div>
          </div>
        )}

        {closeSessionVisible && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[85vh] overflow-auto">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Daily Closing</h3>
              <p className="text-sm text-slate-500 mb-4">Reconcile cashier cash with the system totals.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-sm">
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Opening Cash</p><p className="font-semibold text-slate-900">{formatCurrency(closingSummary?.session?.openingCash ?? session?.meta?.opening_cash ?? 0)}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Expected Cash</p><p className="font-semibold text-slate-900">{formatCurrency((closingSummary?.session?.openingCash || 0) + (closingSummary?.totals?.cashSales || 0))}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Cash Sales</p><p className="font-semibold text-slate-900">{formatCurrency(closingSummary?.totals?.cashSales || 0)}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Variance</p><p className="font-semibold text-slate-900">{formatCurrency((toNumber(actualCash) - toNumber(closingSummary?.session?.openingCash || 0) - toNumber(closingSummary?.totals?.cashSales || 0)))}</p></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={actualCash} onChange={(e) => setActualCash(e.target.value)} type="number" placeholder="Counted cash" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input value={closingRemarks} onChange={(e) => setClosingRemarks(e.target.value)} placeholder="Closing remarks" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setCloseSessionVisible(false)} className="px-4 py-2 rounded-lg border border-slate-200 bg-white">Cancel</button>
                <button onClick={closeSession} disabled={closingLoading || !session?.sessionId} className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold disabled:opacity-60">{closingLoading ? 'Closing...' : 'Close Session'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
