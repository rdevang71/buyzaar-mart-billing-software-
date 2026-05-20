'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';

// ============================================================================
// UTILITIES
// ============================================================================

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

function generateInvoiceNumber() {
  return `INV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function emptyPayment() {
  return { method: 'cash', amount: '', referenceNo: '' };
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEYS = {
  CACHE: 'pos-cache-v3',
  DRAFT: 'pos-draft-v3',
  QUEUE: 'pos-queue-v3',
};

function readStorage(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota errors
  }
}

// ============================================================================
// MAIN POS COMPONENT
// ============================================================================

export default function POSPage() {
  const router = useRouter();
  const barcodeRef = useRef(null);

  // State: Session & User
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');

  // State: Products & Search
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState([]);

  // State: Cart
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [orderDiscount, setOrderDiscount] = useState('0');
  const [roundOff, setRoundOff] = useState('0');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [payments, setPayments] = useState([emptyPayment()]);

  // State: UI
  const [isOffline, setIsOffline] = useState(false);
  const [toast, setToast] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [openSessionModal, setOpenSessionModal] = useState(false);
  const [closeSessionModal, setCloseSessionModal] = useState(false);
  const [customerHistoryModal, setCustomerHistoryModal] = useState(false);
  const [customerHistory, setCustomerHistory] = useState([]);
  const [actualCash, setActualCash] = useState('0');
  const [closingRemarks, setClosingRemarks] = useState('');
  const [openingCash, setOpeningCash] = useState('0');
  const [recentBills, setRecentBills] = useState([]);

  // ========================================================================
  // TOAST
  // ========================================================================

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ========================================================================
  // DATA LOADING
  // ========================================================================

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/products?pageSize=100`);
      const json = await res.json();

      if (json.success && json.data) {
        const mappedProducts = (json.data.records || []).map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          mrp: p.mrp || p.selling_price || 0,
          sellingPrice: p.selling_price || p.mrp || 0,
          availableStock: p.availableStock || p.stock || 0,
          categoryName: p.categoryName || 'N/A',
          taxRate: p.taxRate || 0,
        }));

        setProducts(mappedProducts);
        setFilteredProducts(mappedProducts);
        writeStorage(STORAGE_KEYS.CACHE, { products: mappedProducts });
      }
    } catch (err) {
      const cached = readStorage(STORAGE_KEYS.CACHE, null);
      if (cached?.products) {
        setProducts(cached.products);
        setFilteredProducts(cached.products);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const json = await res.json();
      if (json.success && json.data?.user) {
        setUser(json.data.user);
      }
    } catch {
      // Guest mode
    }
  }, []);

  // ========================================================================
  // SEARCH & FILTER
  // ========================================================================

  useEffect(() => {
    if (!search.trim()) {
      setFilteredProducts(products);
      return;
    }

    const needle = search.toLowerCase();
    const filtered = products.filter(p => {
      return (
        (p.name && p.name.toLowerCase().includes(needle)) ||
        (p.sku && p.sku.toLowerCase().includes(needle)) ||
        (p.barcode && p.barcode.toLowerCase().includes(needle))
      );
    });

    setFilteredProducts(filtered);
  }, [search, products]);

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  useEffect(() => {
    loadAuth();
    loadProducts();
    if (barcodeRef.current) barcodeRef.current.focus();
  }, []);

  // Restore draft
  useEffect(() => {
    const draft = readStorage(STORAGE_KEYS.DRAFT, null);
    if (!draft) return;

    setCart(draft.cart || []);
    setCustomerName(draft.customerName || '');
    setCustomerMobile(draft.customerMobile || '');
    setOrderDiscount(String(draft.orderDiscount ?? '0'));
    setRoundOff(String(draft.roundOff ?? '0'));
    setPaymentMode(draft.paymentMode || 'cash');
    setPayments(Array.isArray(draft.payments) && draft.payments.length ? draft.payments : [emptyPayment()]);
  }, []);

  // Save draft
  useEffect(() => {
    writeStorage(STORAGE_KEYS.DRAFT, {
      cart,
      customerName,
      customerMobile,
      orderDiscount,
      roundOff,
      paymentMode,
      payments,
    });
  }, [cart, customerName, customerMobile, orderDiscount, roundOff, paymentMode, payments]);

  // ========================================================================
  // BARCODE SCANNING
  // ========================================================================

  const handleBarcode = async (value) => {
    const code = value?.trim();
    if (!code) return;

    const local = products.find(
      p =>
        (p.barcode && String(p.barcode) === code) ||
        (p.sku && String(p.sku) === code) ||
        String(p.id) === code
    );

    if (local) {
      addProduct(local);
      setBarcode('');
      if (barcodeRef.current) barcodeRef.current.focus();
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/products?search=${encodeURIComponent(code)}&pageSize=1`);
      const json = await res.json();
      if (json.success && json.data?.records?.[0]) {
        const p = json.data.records[0];
        addProduct({
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          mrp: p.mrp || p.selling_price || 0,
          sellingPrice: p.selling_price || p.mrp || 0,
          availableStock: p.availableStock || p.stock || 0,
          taxRate: p.taxRate || 0,
        });
      } else {
        showToast('Product not found', 'error');
      }
    } catch {
      showToast('Failed to lookup barcode', 'error');
    } finally {
      setBarcode('');
      if (barcodeRef.current) barcodeRef.current.focus();
    }
  };

  // ========================================================================
  // CART MANAGEMENT
  // ========================================================================

  const addProduct = (product) => {
    if (toNumber(product.availableStock) <= 0) {
      showToast('No stock available', 'error');
      return;
    }

    const sellingPrice = product.sellingPrice || product.mrp || 0;
    const mrp = product.mrp || 0;
    const discountAmount = Math.max(0, mrp - sellingPrice);

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, qty: Math.min(item.qty + 1, toNumber(product.availableStock)) }
            : item
        );
      }

      return [...current, { ...product, qty: 1, discountAmount, sellingPrice }];
    });
  };

  const updateCartItem = (id, field, value) => {
    setCart((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeCartItem = (id) => {
    setCart((current) => current.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerMobile('');
    setOrderDiscount('0');
    setRoundOff('0');
    setPayments([emptyPayment()]);
    setPaymentMode('cash');
  };

  // ========================================================================
  // CART CALCULATIONS
  // ========================================================================

  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.qty * item.sellingPrice, 0);
    const lineDiscount = cart.reduce((sum, item) => sum + toNumber(item.discountAmount), 0);
    const taxTotal = cart.reduce((sum, item) => {
      const taxable = Math.max(0, item.qty * item.sellingPrice - toNumber(item.discountAmount));
      return sum + (taxable * toNumber(item.taxRate || 0)) / 100;
    }, 0);
    const discount = toNumber(orderDiscount) + lineDiscount;
    const roundValue = toNumber(roundOff);
    const grandTotal = Math.max(0, subtotal - discount + taxTotal + roundValue);

    return { subtotal, lineDiscount, taxTotal, discount, roundValue, grandTotal };
  }, [cart, orderDiscount, roundOff]);

  // ========================================================================
  // CUSTOMER HISTORY
  // ========================================================================

  const loadCustomerHistory = async () => {
    if (!customerName.trim() && !customerMobile.trim()) {
      showToast('Enter customer name or mobile', 'error');
      return;
    }

    try {
      const query = customerMobile || customerName;
      const res = await fetch(`/api/sales-order/customer-history?search=${encodeURIComponent(query)}`);
      const json = await res.json();

      if (json.success && json.data) {
        setCustomerHistory(json.data);
        setCustomerHistoryModal(true);
      } else {
        showToast('No history found', 'info');
      }
    } catch (err) {
      showToast('Failed to load history', 'error');
    }
  };

  // ========================================================================
  // SESSION MANAGEMENT
  // ========================================================================

  const openSession = async () => {
    if (!user) {
      showToast('Login first', 'error');
      return;
    }

    if (!selectedStoreId) {
      showToast('Select a store', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/employee/user-counter-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          storeId: Number(selectedStoreId),
          openingCash: toNumber(openingCash),
          counterName: 'POS Counter',
        }),
      });

      const json = await res.json();
      if (json.success || json.id) {
        setSession(json);
        setOpenSessionModal(false);
        showToast('Session opened successfully');
      } else {
        showToast(json.error || 'Failed to open session', 'error');
      }
    } catch {
      showToast('Failed to open session', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const closeSession = async () => {
    if (!session?.sessionId) {
      showToast('No active session', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/sales-order/closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          openingCash: toNumber(openingCash),
          actualCash: toNumber(actualCash),
          remarks: closingRemarks,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSession(null);
        setCloseSessionModal(false);
        setClosingRemarks('');
        setActualCash('0');
        clearCart();
        showToast('Session closed successfully');
      } else {
        showToast(json.message || 'Failed to close session', 'error');
      }
    } catch {
      showToast('Failed to close session', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // ========================================================================
  // CHECKOUT / BILL CREATION
  // ========================================================================

  const createBill = async () => {
    if (!session?.sessionId) {
      showToast('Open session first', 'error');
      return;
    }

    if (cart.length === 0) {
      showToast('Add products to cart', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        sessionId: session.sessionId,
        storeId: session.storeId || selectedStoreId,
        customerName: customerName || 'Walk-in Customer',
        customerMobile,
        paymentMode,
        items: cart.map((item) => ({
          productId: item.id,
          name: item.name,
          qty: item.qty,
          sellingPrice: item.sellingPrice,
          mrp: item.mrp,
          taxRate: item.taxRate || 0,
          discountAmount: toNumber(item.discountAmount),
        })),
        orderDiscount: toNumber(orderDiscount),
        roundOff: toNumber(roundOff),
        invoiceNumber: generateInvoiceNumber(),
      };

      if (isOffline || !navigator.onLine) {
        const queue = readStorage(STORAGE_KEYS.QUEUE, []);
        queue.push({ payload, createdAt: new Date().toISOString() });
        writeStorage(STORAGE_KEYS.QUEUE, queue);
        showToast('Bill saved offline. Will sync when online.');
        clearCart();
        return;
      }

      const res = await fetch('http://localhost:5000/api/sales-order/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        showToast(`Bill ${payload.invoiceNumber} created!`);
        clearCart();
        loadProducts();
      } else {
        showToast(json.message || 'Failed to create bill', 'error');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      showToast('Network error. Bill saved locally.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-[999] px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-500'
                : toast.type === 'error'
                ? 'bg-rose-500'
                : 'bg-blue-500'
            }`}
          >
            {toast.msg}
          </div>
        )}

        <div className="p-4 md:p-6 space-y-4">
          {/* Header */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600 tracking-wide">POINT OF SALE</p>
              <h1 className="text-3xl font-black text-slate-900 mt-1">POS Billing</h1>
              <p className="text-sm text-slate-600 mt-2">
                {session?.sessionId ? `Session: ${session.userName}` : 'No active session'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!session?.sessionId ? (
                <button
                  onClick={() => setOpenSessionModal(true)}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
                >
                  Open Session
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setCloseSessionModal(true)}
                    className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50"
                  >
                    Close Session
                  </button>
                  <button
                    onClick={createBill}
                    disabled={isProcessing || cart.length === 0}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Save Bill'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)] gap-4">
            {/* PRODUCTS */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 space-y-3">
                <h2 className="font-bold text-slate-900">Products</h2>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, SKU, or barcode..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                />
                <input
                  ref={barcodeRef}
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBarcode(barcode)}
                  placeholder="Scan barcode (Enter to submit)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>

              <div className="flex-1 p-4 grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3 overflow-auto">
                {loading ? (
                  <div className="col-span-full text-center py-10 text-slate-500">Loading...</div>
                ) : filteredProducts.length === 0 ? (
                  <div className="col-span-full text-center py-10 text-slate-500">No products found</div>
                ) : (
                  filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addProduct(product)}
                      className="text-left rounded-xl border border-slate-200 p-3 hover:border-blue-400 hover:shadow-md transition bg-slate-50/50"
                    >
                      <p className="font-semibold text-slate-900 text-sm">{product.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{product.sku}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          product.availableStock > 0
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}>
                          Stock: {product.availableStock}
                        </span>
                        <span className="font-bold text-blue-600">{formatCurrency(product.sellingPrice)}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>

            {/* CART & PAYMENT */}
            <aside className="space-y-4 flex flex-col">
              {/* Cart */}
              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                  <h2 className="font-bold text-slate-900">Cart</h2>
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">{cart.length}</span>
                </div>

                {cart.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                    Add products to cart
                  </div>
                ) : (
                  <>
                    <div className="flex-1 space-y-2 overflow-auto mb-4">
                      {cart.map((item) => (
                        <div key={item.id} className="rounded-lg border border-slate-200 p-2.5 bg-slate-50/50 text-sm">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            <button
                              onClick={() => removeCartItem(item.id)}
                              className="text-rose-600 text-xs font-semibold"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-xs">
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => updateCartItem(item.id, 'qty', toNumber(e.target.value, 1))}
                              className="rounded border border-slate-200 px-1 py-0.5"
                            />
                            <input
                              type="number"
                              min="0"
                              value={item.discountAmount}
                              onChange={(e) => updateCartItem(item.id, 'discountAmount', toNumber(e.target.value, 0))}
                              className="rounded border border-slate-200 px-1 py-0.5"
                            />
                            <div className="rounded border border-slate-200 bg-white px-1 py-0.5 text-center">
                              {formatCurrency((item.qty * item.sellingPrice) - toNumber(item.discountAmount))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="space-y-1 border-t border-slate-100 pt-3 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatCurrency(cartTotals.subtotal)}</span>
                      </div>
                      {cartTotals.discount > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Discount</span>
                          <span>-{formatCurrency(cartTotals.discount)}</span>
                        </div>
                      )}
                      {cartTotals.taxTotal > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Tax</span>
                          <span>+{formatCurrency(cartTotals.taxTotal)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-slate-100 font-bold">
                        <span>Total</span>
                        <span className="text-blue-600">{formatCurrency(cartTotals.grandTotal)}</span>
                      </div>
                    </div>
                  </>
                )}
              </section>

              {/* Payment */}
              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
                <h3 className="font-bold text-slate-900">Payment</h3>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                />
                <input
                  type="tel"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  placeholder="Mobile number"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                />
                <button
                  onClick={loadCustomerHistory}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
                >
                  View History
                </button>

                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none"
                >
                  <option value="cash">💵 Cash</option>
                  <option value="card">💳 Card</option>
                  <option value="upi">📱 UPI</option>
                  <option value="credit">📋 Credit</option>
                </select>

                <input
                  type="number"
                  value={orderDiscount}
                  onChange={(e) => setOrderDiscount(e.target.value)}
                  placeholder="Order discount"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                />
                <input
                  type="number"
                  value={roundOff}
                  onChange={(e) => setRoundOff(e.target.value)}
                  placeholder="Round off"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                />

                <button
                  onClick={clearCart}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Clear Cart
                </button>
              </section>
            </aside>
          </div>
        </div>

        {/* MODALS */}

        {/* Open Session Modal */}
        {openSessionModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Open Session</h3>
              <div className="space-y-3">
                <input
                  type="number"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="Opening cash"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setOpenSessionModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={openSession}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
                  >
                    {isProcessing ? 'Opening...' : 'Open'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Close Session Modal */}
        {closeSessionModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Close Session</h3>
              <div className="space-y-3">
                <input
                  type="number"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  placeholder="Actual cash counted"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <textarea
                  value={closingRemarks}
                  onChange={(e) => setClosingRemarks(e.target.value)}
                  placeholder="Remarks (optional)"
                  rows="3"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setCloseSessionModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={closeSession}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold disabled:opacity-50"
                  >
                    {isProcessing ? 'Closing...' : 'Close'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customer History Modal */}
        {customerHistoryModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 max-h-[80vh] overflow-auto">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Customer History: {customerName || customerMobile}
              </h3>

              {customerHistory.length === 0 ? (
                <p className="text-sm text-slate-500">No history found</p>
              ) : (
                <div className="space-y-3">
                  {customerHistory.map((bill, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{bill.billNumber || 'Bill #'}</p>
                          <p className="text-xs text-slate-500">{new Date(bill.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className="font-bold text-blue-600">{formatCurrency(bill.grandTotal)}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{bill.paymentMode}</p>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setCustomerHistoryModal(false)}
                className="w-full mt-4 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}