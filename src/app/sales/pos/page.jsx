'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generateQRDataURL, getInvoiceURL } from '@/lib/qrService';
import { validatePhoneNumber } from '@/lib/phoneValidator';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { fetchAuthEndpoint } from '@/lib/auth-endpoints';

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

function formatReceiptDateTime(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function generateInvoiceNumber() {
  return `INV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function emptyPayment() {
  return { method: 'cash', amount: '', referenceNo: '' };
}

const inputClassName = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-400 outline-none';

function normalizeProduct(p) {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku || '',
    barcode: p.barcode || '',
    mrp: toNumber(p.mrp || p.selling_price),
    sellingPrice: toNumber(p.selling_price || p.sellingPrice || p.mrp),
    availableStock: toNumber(p.availableStock ?? p.available_stock ?? p.stock, 0),
    categoryName: p.categoryName || p.category_name || 'N/A',
    taxRate: toNumber(p.taxRate ?? p.tax_rate, 0),
  };
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEYS = {
  CACHE: 'pos-cache-v3',
  DRAFT: 'pos-draft-v3',
  HELD_BILLS: 'pos-held-bills-v3',
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
  const [closingSummary, setClosingSummary] = useState(null);
  const [closingLoading, setClosingLoading] = useState(false);
  const [actualCash, setActualCash] = useState('0');
  const [closingRemarks, setClosingRemarks] = useState('');
  const [openingCash, setOpeningCash] = useState('0');
  const [recentBills, setRecentBills] = useState([]);
  const [heldBills, setHeldBills] = useState([]);
  const [receiptModal, setReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [receiptQR, setReceiptQR] = useState(''); // base-64 QR for the in-app receipt modal

  // Hold-detect: auto-popup when a held bill is found for the typed mobile
  const [holdDetectModal, setHoldDetectModal] = useState(false);
  const [detectedHeldBills, setDetectedHeldBills] = useState([]);

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

  const loadPOSData = useCallback(async (storeIdOverride = '') => {
    setLoading(true);
    try {
      const activeStoreId = storeIdOverride || session?.storeId || selectedStoreId;
      const params = new URLSearchParams({ pageSize: '100' });
      if (activeStoreId) params.set('store_id', String(activeStoreId));
      const res = await fetch(`/api/sales-order/pos?${params}`, { cache: 'no-store' });
      const json = await res.json();

      if (json.success && json.data) {
        const mappedProducts = (json.data.products || []).map(normalizeProduct);
        setProducts(mappedProducts);
        setFilteredProducts(mappedProducts);
        setStores(json.data.stores || []);
        setRecentBills(json.data.recentBills || []);
        if (json.data.session?.sessionId) {
          setSession(json.data.session);
          setSelectedStoreId(String(json.data.session.storeId || ''));
          setOpeningCash(String(json.data.session.openingCash || 0));
        } else if (json.data.selectedStoreId) {
          setSelectedStoreId(String(json.data.selectedStoreId));
        } else {
          setSession(null);
        }
        writeStorage(STORAGE_KEYS.CACHE, {
          products: mappedProducts,
          stores: json.data.stores || [],
          recentBills: json.data.recentBills || [],
        });
      }
    } catch (err) {
      const cached = readStorage(STORAGE_KEYS.CACHE, null);
      if (cached?.products) {
        setProducts(cached.products);
        setFilteredProducts(cached.products);
        setStores(cached.stores || []);
        setRecentBills(cached.recentBills || []);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId, session?.storeId]);

  const loadAuth = useCallback(async () => {
    try {
      const res = await fetchAuthEndpoint('/api/auth/me');
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
    loadPOSData();
    setHeldBills(readStorage(STORAGE_KEYS.HELD_BILLS, []));
    if (barcodeRef.current) barcodeRef.current.focus();
  }, [loadAuth, loadPOSData]);

  // Restore draft
  useEffect(() => {
    const draft = readStorage(STORAGE_KEYS.DRAFT, null);
    if (!draft) return;

    setCart(draft.cart || []);
    setCustomerName(draft.customerName || '');
    setCustomerMobile(draft.customerMobile ? String(draft.customerMobile).replace(/\D/g, '').slice(0, 10) : '');
    setOrderDiscount(String(draft.orderDiscount ?? '0'));
    setRoundOff(String(draft.roundOff ?? '0'));
    setPaymentMode(draft.paymentMode || 'cash');
    setPayments(Array.isArray(draft.payments) && draft.payments.length ? draft.payments : [emptyPayment()]);
  }, []);

  // Generate QR whenever a receipt with a public token is shown
  useEffect(() => {
    const token = receiptData?.bill?.publicToken || receiptData?.bill?.public_token;
    if (!token || !receiptModal) { setReceiptQR(''); return; }
    generateQRDataURL(getInvoiceURL(token), { size: 160 })
      .then(setReceiptQR)
      .catch(() => setReceiptQR(''));
  }, [receiptData, receiptModal]);

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
      const activeStoreId = session?.storeId || selectedStoreId;
      const params = new URLSearchParams({ search: code, pageSize: '1' });
      if (activeStoreId) params.set('store_id', String(activeStoreId));
      const res = await fetch(`/api/sales-order/pos?${params}`);
      const json = await res.json();
      if (json.success && json.data?.products?.[0]) {
        addProduct(normalizeProduct(json.data.products[0]));
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

  const saveHeldBills = (nextHeldBills) => {
    setHeldBills(nextHeldBills);
    writeStorage(STORAGE_KEYS.HELD_BILLS, nextHeldBills);
  };

  const buildHeldBill = () => ({
    id: `HOLD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    heldAt: new Date().toISOString(),
    cart,
    customerName,
    customerMobile,
    orderDiscount,
    roundOff,
    paymentMode,
    payments,
    totals: cartTotals,
  });

  const holdCurrentBill = () => {
    if (cart.length === 0) {
      showToast('Add products before holding bill', 'error');
      return;
    }

    const heldBill = buildHeldBill();
    const nextHeldBills = [heldBill, ...heldBills].slice(0, 25);
    saveHeldBills(nextHeldBills);
    clearCart();
    showToast(`Bill held for ${heldBill.customerName || 'Walk-in Customer'}`);
  };

  const resumeHeldBill = (heldBill) => {
    if (cart.length > 0) {
      showToast('Hold or clear current bill before resuming', 'error');
      return;
    }

    setCart(heldBill.cart || []);
    setCustomerName(heldBill.customerName || '');
    setCustomerMobile(heldBill.customerMobile ? String(heldBill.customerMobile).replace(/\D/g, '').slice(0, 10) : '');
    setOrderDiscount(String(heldBill.orderDiscount ?? '0'));
    setRoundOff(String(heldBill.roundOff ?? '0'));
    setPaymentMode(heldBill.paymentMode || 'cash');
    setPayments(Array.isArray(heldBill.payments) && heldBill.payments.length ? heldBill.payments : [emptyPayment()]);
    saveHeldBills(heldBills.filter((bill) => bill.id !== heldBill.id));
    setHoldDetectModal(false);
    setDetectedHeldBills([]);
    showToast('Held bill resumed');
    if (barcodeRef.current) barcodeRef.current.focus();
  };

  const removeHeldBill = (heldBillId) => {
    saveHeldBills(heldBills.filter((bill) => bill.id !== heldBillId));
    showToast('Held bill removed', 'info');
  };

  // ── Auto-detect held bills by mobile number ─────────────────────────────
  // Called every time the mobile input reaches 10 digits.
  const checkForHeldBills = (mobile) => {
    if (!mobile || mobile.length < 10) return;
    const normalized = mobile.replace(/\D/g, '').slice(0, 10);
    const matches = heldBills
      .filter((b) => b.customerMobile && b.customerMobile.replace(/\D/g, '').slice(0, 10) === normalized)
      .sort((a, b) => new Date(b.heldAt || 0) - new Date(a.heldAt || 0));
    if (matches.length > 0) {
      setDetectedHeldBills(matches);
      setHoldDetectModal(true);
    }
  };

  // ── One-click resume from the detection modal ────────────────────────────
  // If the operator already has items in the cart, the current cart is
  // auto-held first so no work is lost, then the selected held bill is restored.
  const holdCurrentAndResume = (heldBill) => {
    // Build the new held-bills list: hold current (if any), remove the target
    const withoutTarget = heldBills.filter((b) => b.id !== heldBill.id);
    let nextHeldBills = withoutTarget;

    if (cart.length > 0) {
      const currentHeld = buildHeldBill();
      nextHeldBills = [currentHeld, ...withoutTarget].slice(0, 25);
    }

    // Restore the held bill into the cart
    setCart(heldBill.cart || []);
    setCustomerName(heldBill.customerName || '');
    setCustomerMobile(
      heldBill.customerMobile
        ? String(heldBill.customerMobile).replace(/\D/g, '').slice(0, 10)
        : ''
    );
    setOrderDiscount(String(heldBill.orderDiscount ?? '0'));
    setRoundOff(String(heldBill.roundOff ?? '0'));
    setPaymentMode(heldBill.paymentMode || 'cash');
    setPayments(
      Array.isArray(heldBill.payments) && heldBill.payments.length
        ? heldBill.payments
        : [emptyPayment()]
    );

    saveHeldBills(nextHeldBills);
    setHoldDetectModal(false);
    setDetectedHeldBills([]);
    showToast(
      cart.length > 0
        ? `Current cart held · Resumed ${heldBill.customerName || 'held bill'}`
        : `Resumed ${heldBill.customerName || 'held bill'}`
    );
    if (barcodeRef.current) barcodeRef.current.focus();
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

  const canGenerateBill = !!session?.sessionId && cart.length > 0 && !isProcessing;

  // ========================================================================
  // CUSTOMER HISTORY
  // ========================================================================

  const loadCustomerHistory = async () => {
    if (!customerName.trim() && !customerMobile.trim()) {
      showToast('Enter customer name or mobile', 'error');
      return;
    }

    try {
      const historyQuery = customerMobile || customerName;
      const activeStoreId = session?.storeId || selectedStoreId;
      const params = new URLSearchParams({ search: historyQuery });
      if (activeStoreId) params.set('store_id', String(activeStoreId));
      const res = await fetch(`/api/sales-order/customer-history?${params}`);
      const json = await res.json();

      if (json.success && json.data) {
        setCustomerHistory(json.data.bills || []);
        setCustomerHistoryModal(true);
      } else {
        showToast('No history found', 'info');
      }
    } catch (err) {
      showToast('Failed to load history', 'error');
    }
  };

  const selectCustomerFromHistory = (bill) => {
    setCustomerName(bill.customerName || customerName);
    setCustomerMobile(bill.customerMobile ? String(bill.customerMobile).replace(/\D/g, '').slice(0, 10) : (customerMobile || ''));
    if (bill.paymentMode) setPaymentMode(bill.paymentMode);
    setCustomerHistoryModal(false);
    showToast('Customer details filled from history');
  };

  const printReceipt = async (receipt = receiptData) => {
    if (!receipt || typeof window === 'undefined') return;

    const bill  = receipt.bill  || {};
    const items = receipt.items || [];

    // Generate QR for the print window (async, non-blocking)
    let qrBlock = '';
    const token = bill.publicToken || bill.public_token;
    if (token) {
      try {
        const url    = getInvoiceURL(token);
        const qrData = await generateQRDataURL(url, { size: 120 });
        qrBlock = `
          <div style="margin-top:12px;padding-top:12px;border-top:1px dashed #94a3b8;text-align:center">
            <img src="${qrData}" alt="QR" style="width:96px;height:96px" />
            <p style="font-size:9px;color:#64748b;margin:4px 0 2px;font-weight:700">SCAN TO VIEW DIGITAL INVOICE</p>
            <p style="font-size:8px;color:#94a3b8;word-break:break-all">${url}</p>
          </div>`;
      } catch { /* QR failed — skip silently */ }
    }

    const printWindow = window.open('', '_blank', 'width=380,height=720');
    if (!printWindow) {
      showToast('Popup blocked. Please allow popups to print receipt.', 'error');
      return;
    }

    const rows = items.map((item) => `
      <tr>
        <td>${item.name || item.product_name || 'Product'}<br><small>${item.sku || ''}</small></td>
        <td style="text-align:center">${toNumber(item.qty, 1)}</td>
        <td style="text-align:right">${formatCurrency(item.selling_price || item.sellingPrice || 0)}</td>
        <td style="text-align:right">${formatCurrency(item.line_total || (toNumber(item.qty, 1) * toNumber(item.selling_price || item.sellingPrice)))}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Receipt ${bill.billNumber || bill.bill_number || ''}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; margin: 0; padding: 16px; font-size: 12px; }
            h1 { font-size: 18px; margin: 0 0 4px; text-align: center; }
            .muted { color: #475569; }
            .center { text-align: center; }
            .line { border-top: 1px dashed #94a3b8; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 5px 0; vertical-align: top; }
            th { border-bottom: 1px solid #cbd5e1; font-size: 11px; }
            .totals div { display: flex; justify-content: space-between; margin: 3px 0; }
            .grand { font-size: 16px; font-weight: 800; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>BillingPro</h1>
          <div class="center muted">GST Invoice / POS Receipt</div>
          <div class="line"></div>
          <div><strong>Bill:</strong> ${bill.billNumber || bill.bill_number || bill.invoiceNumber || '-'}</div>
          <div><strong>Date & Time:</strong> ${formatReceiptDateTime(bill.createdAt || bill.created_at)}</div>
          <div><strong>Customer:</strong> ${bill.customerName || bill.customer_name || 'Walk-in Customer'}</div>
          ${(bill.customerMobile || bill.customer_mobile) ? `<div><strong>Mobile:</strong> ${bill.customerMobile || bill.customer_mobile}</div>` : ''}
          <div class="line"></div>
          <table>
            <thead>
              <tr><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amt</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="line"></div>
          <div class="totals">
            <div><span>Subtotal</span><strong>${formatCurrency(bill.subtotal || receipt.subtotal || 0)}</strong></div>
            <div><span>Discount</span><strong>${formatCurrency(bill.discount_total || bill.discountTotal || receipt.discount || 0)}</strong></div>
            <div><span>Tax</span><strong>${formatCurrency(bill.tax_total || bill.totalTax || receipt.taxTotal || 0)}</strong></div>
            <div class="grand"><span>Total</span><span>${formatCurrency(bill.grand_total || bill.grandTotal || receipt.grandTotal || 0)}</span></div>
            <div><span>Paid By</span><strong>${bill.payment_mode || bill.paymentMode || 'cash'}</strong></div>
          </div>
          <div class="line"></div>
          <div class="center muted">Thank you. Visit again.</div>
          ${qrBlock}
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const openReceiptFromBill = async (bill) => {
    const billId = bill.billNumber || bill.invoiceNumber || bill.bill_number || bill.id;
    if (!billId) return;

    try {
      const res = await fetch(`/api/pos/billing?bill_id=${encodeURIComponent(billId)}`);
      const json = await res.json();
      if (!json.success) {
        showToast(json.message || 'Failed to load receipt', 'error');
        return;
      }
      setReceiptData(json.data);
      setReceiptModal(true);
    } catch {
      showToast('Failed to load receipt', 'error');
    }
  };

  // ========================================================================
  // SESSION MANAGEMENT
  // ========================================================================

  const openCloseSessionModal = async () => {
    if (!session?.sessionId) {
      showToast('No active session', 'error');
      return;
    }

    setCloseSessionModal(true);
    setClosingLoading(true);
    try {
      const params = new URLSearchParams({ sessionId: session.sessionId });
      const res = await fetch(`/api/sales-order/closing?${params}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success && json.data) {
        setClosingSummary(json.data);
        const expectedCash = json.data.totals?.expectedCash;
        if (expectedCash !== undefined && expectedCash !== null) {
          setActualCash(String(expectedCash));
        }
      } else {
        showToast(json.message || 'Failed to load closing summary', 'error');
      }
    } catch {
      showToast('Failed to load closing summary', 'error');
    } finally {
      setClosingLoading(false);
    }
  };

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
      if (res.ok && (json.success || json.id)) {
        const openedSession = json.data?.session || json;
        setSession(openedSession);
        setSelectedStoreId(String(openedSession.storeId || selectedStoreId));
        setOpenSessionModal(false);
        loadPOSData(openedSession.storeId || selectedStoreId);
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
        setClosingSummary(null);
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

    if (customerMobile && !validatePhoneNumber(customerMobile).isValid) {
      showToast(validatePhoneNumber(customerMobile).error, 'error');
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

      const res = await fetch('/api/sales-order/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          payments: payments.map((p) => ({
            ...p,
            amount: toNumber(p.amount || cartTotals.grandTotal),
          })),
        }),
      });

      const json = await res.json();
      if (json.success) {
        const savedBill = json.data?.bill;
        const receiptItems = cart.map((item) => ({
          ...item,
          name: item.name,
          selling_price: item.sellingPrice,
          line_total: (item.qty * item.sellingPrice) - toNumber(item.discountAmount) + ((Math.max(0, item.qty * item.sellingPrice - toNumber(item.discountAmount)) * toNumber(item.taxRate)) / 100),
        }));
        showToast(json.data?.message || `Bill ${payload.invoiceNumber} created!`);
        setRecentBills((current) => [savedBill, ...current].filter(Boolean).slice(0, 10));
        setReceiptData({
          bill: {
            ...savedBill,
            customerName:  payload.customerName,
            customerMobile,
            publicToken:   savedBill?.publicToken ?? savedBill?.public_token ?? null,
            subtotal:      cartTotals.subtotal,
            discountTotal: cartTotals.discount,
            taxTotal:      cartTotals.taxTotal,
            grandTotal:    cartTotals.grandTotal,
            paymentMode,
            createdAt: savedBill?.createdAt || new Date().toISOString(),
          },
          items: receiptItems,
          subtotal: cartTotals.subtotal,
          discount: cartTotals.discount,
          taxTotal: cartTotals.taxTotal,
          grandTotal: cartTotals.grandTotal,
        });
        setReceiptModal(true);
        if (
          savedBill &&
          (savedBill.customerMobile === customerMobile ||
            savedBill.customerName?.toLowerCase() === customerName.toLowerCase())
        ) {
          setCustomerHistory((current) => [savedBill, ...current].slice(0, 50));
        }
        clearCart();
        loadPOSData();
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
                {session?.sessionId ? `Session: ${session.userName || 'POS User'}${session.storeName ? ` at ${session.storeName}` : ''}` : 'No active session'}
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
                    onClick={openCloseSessionModal}
                    className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50"
                  >
                    Close Session
                  </button>
                  <button
                    onClick={holdCurrentBill}
                    disabled={cart.length === 0}
                    className="px-4 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 font-semibold hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    Hold Bill
                  </button>
                  <button
                    onClick={createBill}
                    disabled={!canGenerateBill}
                    style={{
                      minWidth: '150px',
                      padding: '0.75rem 1.25rem',
                      borderRadius: '0.625rem',
                      border: '1px solid transparent',
                      background: canGenerateBill ? '#16a34a' : '#94a3b8',
                      color: '#ffffff',
                      fontWeight: 800,
                      cursor: canGenerateBill ? 'pointer' : 'not-allowed',
                      boxShadow: canGenerateBill ? '0 8px 18px rgba(22, 163, 74, 0.22)' : 'none',
                    }}
                  >
                    {isProcessing ? 'Processing...' : `Generate Bill (${formatCurrency(cartTotals.grandTotal)})`}
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
                  className={inputClassName}
                />
                <input
                  ref={barcodeRef}
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBarcode(barcode)}
                  placeholder="Scan barcode (Enter to submit)"
                  className={inputClassName}
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
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
                  <h2 className="font-bold text-slate-900">Cart</h2>
                  <div className="flex items-center gap-2">
                    {cart.length > 0 && (
                      <>
                        <button
                          onClick={holdCurrentBill}
                          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"
                        >
                          Hold
                        </button>
                        <button
                          onClick={createBill}
                          disabled={!canGenerateBill}
                          style={{
                            padding: '0.625rem 1rem',
                            borderRadius: '0.5rem',
                            border: '1px solid transparent',
                            background: canGenerateBill ? '#16a34a' : '#94a3b8',
                            color: '#ffffff',
                            fontWeight: 800,
                            cursor: canGenerateBill ? 'pointer' : 'not-allowed',
                          }}
                        >
                          Generate Bill
                        </button>
                      </>
                    )}
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">{cart.length}</span>
                  </div>
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
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-900"
                            />
                            <input
                              type="number"
                              min="0"
                              value={item.discountAmount}
                              onChange={(e) => updateCartItem(item.id, 'discountAmount', toNumber(e.target.value, 0))}
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-900"
                            />
                            <div className="rounded border border-slate-300 bg-white px-2 py-1 text-center text-slate-900 font-semibold">
                              {formatCurrency((item.qty * item.sellingPrice) - toNumber(item.discountAmount))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="space-y-1 border-t border-slate-200 pt-3 text-sm text-slate-800">
                      <div className="flex justify-between text-slate-800">
                        <span>Subtotal</span>
                        <span className="font-semibold">{formatCurrency(cartTotals.subtotal)}</span>
                      </div>
                      {cartTotals.discount > 0 && (
                        <div className="flex justify-between text-slate-800">
                          <span>Discount</span>
                          <span className="font-semibold">-{formatCurrency(cartTotals.discount)}</span>
                        </div>
                      )}
                      {cartTotals.taxTotal > 0 && (
                        <div className="flex justify-between text-slate-800">
                          <span>Tax</span>
                          <span className="font-semibold">+{formatCurrency(cartTotals.taxTotal)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
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
                  className={inputClassName}
                />
                <div>
                  <input
                    type="tel"
                    value={customerMobile}
                    onChange={(e) => {
                      const digits = String(e.target.value).replace(/\D/g, '').slice(0, 10);
                      setCustomerMobile(digits);
                      // Auto-detect held bills the moment a complete mobile is typed
                      if (digits.length === 10) checkForHeldBills(digits);
                    }}
                    placeholder="Mobile number (10 digits)"
                    maxLength="10"
                    className={inputClassName}
                  />
                  {customerMobile && !validatePhoneNumber(customerMobile).isValid && (
                    <p className="text-xs text-red-600 mt-1">{validatePhoneNumber(customerMobile).error}</p>
                  )}
                </div>
                <button
                  onClick={loadCustomerHistory}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
                >
                  View History
                </button>

                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-400 outline-none"
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
                  className={inputClassName}
                />
                <input
                  type="number"
                  value={roundOff}
                  onChange={(e) => setRoundOff(e.target.value)}
                  placeholder="Round off"
                  className={inputClassName}
                />

                <button
                  onClick={createBill}
                  disabled={!canGenerateBill}
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    borderRadius: '0.625rem',
                    border: '1px solid transparent',
                    background: canGenerateBill ? '#16a34a' : '#94a3b8',
                    color: '#ffffff',
                    fontWeight: 900,
                    cursor: canGenerateBill ? 'pointer' : 'not-allowed',
                    boxShadow: canGenerateBill ? '0 8px 18px rgba(22, 163, 74, 0.22)' : 'none',
                  }}
                >
                  {!session?.sessionId
                    ? 'Open Session to Generate Bill'
                    : isProcessing
                    ? 'Generating...'
                    : `Generate Bill - ${formatCurrency(cartTotals.grandTotal)}`}
                </button>

                <button
                  onClick={holdCurrentBill}
                  disabled={cart.length === 0}
                  className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 font-semibold hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  Hold Bill
                </button>

                <button
                  onClick={clearCart}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Clear Cart
                </button>
              </section>

              {/* Held Bills */}
              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Held Bills</h3>
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                    {heldBills.length}
                  </span>
                </div>

                {heldBills.length === 0 ? (
                  <p className="text-sm text-slate-500">No bills on hold</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {heldBills.map((heldBill, idx) => (
                      <div
                        key={heldBill.id || idx}
                        className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {heldBill.customerName || 'Walk-in Customer'}
                            </p>
                            <p className="text-xs text-slate-600 truncate">
                              {heldBill.customerMobile || 'No mobile'} - {(heldBill.cart || []).length} items
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {heldBill.heldAt ? new Date(heldBill.heldAt).toLocaleString('en-IN') : ''}
                            </p>
                          </div>
                          <span className="shrink-0 font-bold text-amber-800">
                            {formatCurrency(heldBill.totals?.grandTotal || 0)}
                          </span>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => resumeHeldBill(heldBill)}
                            className="flex-1 rounded-md border border-blue-200 bg-white px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50"
                          >
                            Resume
                          </button>
                          <button
                            type="button"
                            onClick={() => removeHeldBill(heldBill.id)}
                            className="rounded-md border border-rose-200 bg-white px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Recent Bills */}
              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Recent Bills</h3>
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">
                    {recentBills.length}
                  </span>
                </div>

                {recentBills.length === 0 ? (
                  <p className="text-sm text-slate-500">No recent bills yet</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {recentBills.map((bill, idx) => (
                      <div
                        key={bill.id || bill.billNumber || idx}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {bill.billNumber || bill.invoiceNumber || `Bill ${idx + 1}`}
                            </p>
                            <p className="text-xs text-slate-600 truncate">
                              {bill.customerName || 'Walk-in Customer'}
                              {bill.customerMobile ? ` - ${bill.customerMobile}` : ''}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {bill.createdAt ? new Date(bill.createdAt).toLocaleString('en-IN') : ''}
                              {bill.paymentMode ? ` - ${bill.paymentMode}` : ''}
                            </p>
                          </div>
                          <span className="shrink-0 font-bold text-blue-600">
                            {formatCurrency(bill.grandTotal)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openReceiptFromBill(bill)}
                          className="mt-2 rounded-md border border-blue-200 bg-white px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50"
                        >
                          Receipt
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </div>
        </div>

        {cart.length > 0 && (
          <div
            style={{
              position: 'sticky',
              bottom: 0,
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              padding: '0.875rem 1.25rem',
              margin: '0 1rem',
              border: '1px solid #cbd5e1',
              borderRadius: '0.75rem 0.75rem 0 0',
              background: '#ffffff',
              boxShadow: '0 -10px 24px rgba(15, 23, 42, 0.12)',
            }}
          >
            <div>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.75rem', fontWeight: 700 }}>Bill Total</p>
              <p style={{ margin: 0, color: '#0f172a', fontSize: '1.125rem', fontWeight: 900 }}>
                {formatCurrency(cartTotals.grandTotal)}
              </p>
            </div>
            <button
              onClick={createBill}
              disabled={!canGenerateBill}
              style={{
                minWidth: '180px',
                padding: '0.875rem 1.25rem',
                borderRadius: '0.625rem',
                border: '1px solid transparent',
                background: canGenerateBill ? '#16a34a' : '#94a3b8',
                color: '#ffffff',
                fontWeight: 900,
                cursor: canGenerateBill ? 'pointer' : 'not-allowed',
              }}
            >
              {isProcessing ? 'Generating...' : 'Generate Bill'}
            </button>
          </div>
        )}

        {/* MODALS */}

        {/* Receipt Modal */}
        {receiptModal && receiptData && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 max-h-[90vh] overflow-auto">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Bill Receipt</h3>
                  <p className="text-sm text-slate-600">
                    {receiptData.bill?.billNumber || receiptData.bill?.bill_number || receiptData.bill?.invoiceNumber}
                  </p>
                </div>
                <button
                  onClick={() => setReceiptModal(false)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm font-bold text-slate-800"
                >
                  Close
                </button>
              </div>

              <div className="py-4 text-sm text-slate-800">
                <div className="text-center">
                  <p className="text-xl font-black text-slate-950">BillingPro</p>
                  <p className="text-xs text-slate-500">GST Invoice / POS Receipt</p>
                </div>
                <div className="my-3 border-t border-dashed border-slate-300" />
                <div className="space-y-1">
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold text-slate-600">Bill No.</span>
                    <span className="text-right font-bold text-slate-950">
                      {receiptData.bill?.billNumber || receiptData.bill?.bill_number || receiptData.bill?.invoiceNumber || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold text-slate-600">Date & Time</span>
                    <span className="text-right font-bold text-slate-950">
                      {formatReceiptDateTime(receiptData.bill?.createdAt || receiptData.bill?.created_at)}
                    </span>
                  </div>
                  <p><strong>Customer:</strong> {receiptData.bill?.customerName || receiptData.bill?.customer_name || 'Walk-in Customer'}</p>
                  {(receiptData.bill?.customerMobile || receiptData.bill?.customer_mobile) && (
                    <p><strong>Mobile:</strong> {receiptData.bill?.customerMobile || receiptData.bill?.customer_mobile}</p>
                  )}
                  <p><strong>Payment:</strong> {receiptData.bill?.paymentMode || receiptData.bill?.payment_mode || 'cash'}</p>
                </div>
                <div className="my-3 border-t border-dashed border-slate-300" />
                <div className="space-y-2">
                  {(receiptData.items || []).map((item, idx) => (
                    <div key={item.id || idx} className="flex justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{item.name || item.product_name || 'Product'}</p>
                        <p className="text-xs text-slate-500">Qty {toNumber(item.qty, 1)} x {formatCurrency(item.selling_price || item.sellingPrice)}</p>
                      </div>
                      <p className="font-bold text-slate-950">
                        {formatCurrency(item.line_total || (toNumber(item.qty, 1) * toNumber(item.selling_price || item.sellingPrice)))}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="my-3 border-t border-dashed border-slate-300" />
                <div className="space-y-1">
                  <div className="flex justify-between"><span>Subtotal</span><strong>{formatCurrency(receiptData.bill?.subtotal || receiptData.subtotal || 0)}</strong></div>
                  <div className="flex justify-between"><span>Discount</span><strong>{formatCurrency(receiptData.bill?.discount_total || receiptData.bill?.discountTotal || receiptData.discount || 0)}</strong></div>
                  <div className="flex justify-between"><span>Tax</span><strong>{formatCurrency(receiptData.bill?.tax_total || receiptData.bill?.totalTax || receiptData.taxTotal || 0)}</strong></div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-black text-blue-700">
                    <span>Total</span>
                    <span>{formatCurrency(receiptData.bill?.grand_total || receiptData.bill?.grandTotal || receiptData.grandTotal || 0)}</span>
                  </div>
                </div>
              </div>

              {/* QR code — scan to open digital invoice */}
              {receiptQR && (
                <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 mb-3">
                  <img src={receiptQR} alt="Invoice QR" className="w-20 h-20 rounded-lg border border-slate-200 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-[13px]">Digital Invoice</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Customer can scan to view, download or print this invoice anytime.
                    </p>
                    {(receiptData?.bill?.publicToken || receiptData?.bill?.public_token) && (
                      <a
                        href={getInvoiceURL(receiptData.bill.publicToken || receiptData.bill.public_token)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-600 font-semibold hover:underline mt-1 inline-block"
                      >
                        Open invoice →
                      </a>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={() => printReceipt()}
                className="w-full rounded-lg bg-slate-900 px-4 py-3 font-bold text-white hover:bg-slate-800"
              >
                Print Receipt (with QR)
              </button>
            </div>
          </div>
        )}

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
                  className={inputClassName}
                />
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white text-slate-900"
                >
                  <option value="">Select store</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOpenSessionModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 font-semibold"
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
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 max-h-[90vh] overflow-auto">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Close Session</h3>
              <div className="space-y-3">
                {closingLoading ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                    Loading closing summary...
                  </div>
                ) : closingSummary?.totals ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <ClosingStat label="Opening Cash" value={formatCurrency(closingSummary.totals.openingCash)} />
                      <ClosingStat label="Total Sale" value={formatCurrency(closingSummary.totals.grossSales)} />
                      <ClosingStat label="Cash Sale" value={formatCurrency(closingSummary.totals.cashSales)} />
                      <ClosingStat label="Card Sale" value={formatCurrency(closingSummary.totals.cardSales)} />
                      <ClosingStat label="UPI Sale" value={formatCurrency(closingSummary.totals.upiSales)} />
                      <ClosingStat label="Paid Total" value={formatCurrency(closingSummary.totals.paidTotal)} />
                      <ClosingStat label="Bills" value={closingSummary.totals.billCount || 0} />
                      <ClosingStat label="Expected Cash" value={formatCurrency(closingSummary.totals.expectedCash)} strong />
                    </div>
                  </div>
                ) : null}
                <input
                  type="number"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  placeholder="Actual cash counted"
                  className={inputClassName}
                />
                <textarea
                  value={closingRemarks}
                  onChange={(e) => setClosingRemarks(e.target.value)}
                  placeholder="Remarks (optional)"
                  rows="3"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setCloseSessionModal(false);
                      setClosingSummary(null);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={closeSession}
                    disabled={isProcessing || closingLoading}
                    className="flex-1 px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold disabled:opacity-50"
                  >
                    {isProcessing ? 'Closing...' : 'Close'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Hold Bill Detection Modal ───────────────────────────────────── */}
        {holdDetectModal && detectedHeldBills.length > 0 && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">

              {/* Header */}
              <div className="flex items-center gap-3 bg-amber-50 border-b border-amber-100 px-5 py-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl shrink-0">
                  ⏸
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-[15px]">Held Bill Found</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {detectedHeldBills.length === 1
                      ? `1 held bill for ${detectedHeldBills[0].customerMobile}`
                      : `${detectedHeldBills.length} held bills for ${detectedHeldBills[0].customerMobile}`}
                  </p>
                </div>
              </div>

              {/* Bill list — sorted latest first */}
              <div className="p-4 space-y-2 max-h-72 overflow-auto">
                {detectedHeldBills.map((heldBill) => (
                  <button
                    key={heldBill.id}
                    type="button"
                    onClick={() => holdCurrentAndResume(heldBill)}
                    className="w-full text-left rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3 hover:bg-amber-100 hover:border-amber-400 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">
                          {heldBill.customerName || 'Walk-in Customer'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {(heldBill.cart || []).length} item{(heldBill.cart || []).length !== 1 ? 's' : ''}
                          {heldBill.heldAt
                            ? ` · ${new Date(heldBill.heldAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })}`
                            : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-amber-700 text-sm">
                          {formatCurrency(heldBill.totals?.grandTotal || 0)}
                        </p>
                        <p className="text-[10px] text-blue-600 font-semibold group-hover:underline mt-0.5">
                          Resume →
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Auto-hold notice when current cart has items */}
              {cart.length > 0 && (
                <div className="mx-4 mb-3 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700 font-medium">
                  Your current cart ({cart.length} item{cart.length !== 1 ? 's' : ''}) will be
                  auto-held when you resume.
                </div>
              )}

              {/* Dismiss */}
              <div className="px-4 pb-4">
                <button
                  type="button"
                  onClick={() => { setHoldDetectModal(false); setDetectedHeldBills([]); }}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Start Fresh Billing
                </button>
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
                    <button
                      key={bill.id || idx}
                      type="button"
                      onClick={() => selectCustomerFromHistory(bill)}
                      className="w-full text-left rounded-lg border border-slate-200 p-3 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{bill.billNumber || 'Bill #'}</p>
                          <p className="text-xs text-slate-500">{new Date(bill.createdAt).toLocaleDateString()}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            {bill.customerName || 'Walk-in Customer'} {bill.customerMobile ? `- ${bill.customerMobile}` : ''}
                          </p>
                        </div>
                        <span className="font-bold text-blue-600">{formatCurrency(bill.grandTotal)}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {bill.paymentMode} {bill.itemCount ? `- ${bill.itemCount} items` : ''}
                      </p>
                      <p className="text-xs font-semibold text-blue-600 mt-2">Select this customer</p>
                    </button>
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

function ClosingStat({ label, value, strong = false }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 text-sm ${strong ? 'font-black text-slate-950' : 'font-bold text-slate-800'}`}>
        {value}
      </p>
    </div>
  );
}
