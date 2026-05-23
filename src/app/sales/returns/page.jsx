'use client';

import { useEffect, useMemo, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { fetchAuthEndpoint } from '@/lib/auth-endpoints';

export default function ReturnsPage() {
  const [formData, setFormData] = useState({
    bill_number: '',
    return_type: 'return',
    reason: '',
    items: [],
    refund_amount: 0
  });
  const [loading, setLoading] = useState(false);
  const [searchedBill, setSearchedBill] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [toast, setToast] = useState(null);
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [returnHistory, setReturnHistory] = useState([]);
  const [activeReceipt, setActiveReceipt] = useState(null);

  const canReviewRequests = useMemo(() => user?.role === 'super_admin' || user?.role === 'admin' || user?.permissions?.includes('*'), [user]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  async function loadUser() {
    try {
      const res = await fetchAuthEndpoint('/api/auth/me');
      const json = await res.json();
      setUser(json.data?.user || null);
    } catch {
      setUser(null);
    }
  }

  async function loadRequests() {
    try {
      const res = await fetch('/api/pos/returns?status=pending&pageSize=50', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) setRequests(Array.isArray(json.data) ? json.data : []);
    } catch {
      setRequests([]);
    }
  }

  async function loadMyRequests() {
    try {
      const res = await fetch('/api/pos/returns?scope=mine&pageSize=20', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) setMyRequests(Array.isArray(json.data) ? json.data : []);
    } catch {
      setMyRequests([]);
    }
  }

  async function loadReturnHistory() {
    try {
      const res = await fetch('/api/pos/returns?status=completed&pageSize=50', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) setReturnHistory(Array.isArray(json.data) ? json.data : []);
    } catch {
      setReturnHistory([]);
    }
  }

  useEffect(() => {
    loadUser();
    loadRequests();
    loadMyRequests();
    loadReturnHistory();
  }, []);

  async function searchBill() {
    if (!formData.bill_number.trim()) {
      showToast('Enter bill number', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/pos/billing?bill_id=${formData.bill_number}`);
      const json = await res.json();

      if (json.success) {
        setSearchedBill(json.data);
        setSelectedItems([]);
      } else {
        showToast('Bill not found', 'error');
        setSearchedBill(null);
      }
    } catch (err) {
      showToast('Error searching bill', 'error');
    } finally {
      setLoading(false);
    }
  }

  function toggleItemSelection(item) {
    if (selectedItems.find(i => i.product_id === item.product_id)) {
      setSelectedItems(selectedItems.filter(i => i.product_id !== item.product_id));
    } else {
      setSelectedItems([...selectedItems, { ...item, return_qty: 1 }]);
    }
  }

  function updateReturnQty(productId, qty) {
    setSelectedItems(selectedItems.map(item =>
      item.product_id === productId ? { ...item, return_qty: qty } : item
    ));
  }

  async function submitReturn() {
    if (selectedItems.length === 0) {
      showToast('Select items to return', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/pos/returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original_bill_id: formData.bill_number,
          return_type: formData.return_type,
          reason: formData.reason,
          items: selectedItems.map(item => ({
            product_id: item.product_id,
            qty: item.return_qty,
            original_price: item.selling_price
          })),
          refund_amount: calculateRefund(),
          store_id: searchedBill?.bill?.store_id
        })
      });

      const json = await res.json();

      if (json.success) {
        showToast('Return request sent for approval');
        setFormData({ bill_number: '', return_type: 'return', reason: '', items: [], refund_amount: 0 });
        setSearchedBill(null);
        setSelectedItems([]);
        loadRequests();
        loadMyRequests();
        loadReturnHistory();
      } else {
        showToast(json.message || 'Error processing return', 'error');
      }
    } catch (err) {
      showToast('Error processing return', 'error');
    } finally {
      setLoading(false);
    }
  }

  function calculateRefund() {
    return selectedItems.reduce((sum, item) => sum + (item.return_qty * item.selling_price), 0);
  }

  function getReceiptDetails(request) {
    if (!request) return {};
    const meta = typeof request.meta === 'string' ? {} : (request.meta || {});
    return request.receipt || meta.receipt || {};
  }

  async function reviewRequest(returnId, action) {
    setLoading(true);
    try {
      const res = await fetch('/api/pos/returns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ return_id: returnId, action }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(action === 'approve' ? 'Return approved and stock updated' : 'Return request declined');
        loadRequests();
        loadMyRequests();
        loadReturnHistory();
      } else {
        showToast(json.message || 'Unable to review request', 'error');
      }
    } catch {
      showToast('Unable to review request', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function proceedReturn(request) {
    setLoading(true);
    try {
      const paymentMode = request.original_payment_mode || request.refund_payment_mode || 'cash';
      const res = await fetch('/api/pos/returns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          return_id: request.id,
          action: 'complete',
          refund_payment_mode: paymentMode,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActiveReceipt({
          ...request,
          ...(json.data || {}),
          receipt: json.data?.receipt,
          refund_payment_mode: paymentMode,
          status: 'completed',
        });
        showToast('Return completed and receipt generated');
        loadRequests();
        loadMyRequests();
        loadReturnHistory();
      } else {
        showToast(json.message || 'Unable to complete return', 'error');
      }
    } catch {
      showToast('Unable to complete return', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Returns & Exchange</h1>

        {toast && (
          <div className={`mb-4 p-4 rounded ${toast.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {toast.msg}
          </div>
        )}

        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">My Return Requests</h2>
              <p className="text-sm text-gray-500">Your submitted return requests and approval status.</p>
            </div>
            <button
              onClick={loadMyRequests}
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
          {myRequests.length === 0 ? (
            <p className="rounded bg-gray-50 p-4 text-sm text-gray-500">No return requests submitted yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Request</th>
                    <th className="px-3 py-2">Bill</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Refund</th>
                    <th className="px-3 py-2">Payment</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Updated</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {myRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-3 py-3 font-medium text-gray-900">#{request.id}</td>
                      <td className="px-3 py-3 text-gray-700">{request.bill_number || request.original_bill_id}</td>
                      <td className="px-3 py-3 text-gray-700">
                        <div className="font-medium text-gray-900">{request.customer_name || 'Walk-in Customer'}</div>
                        <div className="text-xs text-gray-500">{request.customer_mobile || 'No mobile'}</div>
                      </td>
                      <td className="px-3 py-3 capitalize text-gray-700">{request.return_type}</td>
                      <td className="px-3 py-3 font-semibold text-gray-900">Rs.{parseFloat(request.refund_amount || 0).toFixed(2)}</td>
                      <td className="px-3 py-3 capitalize text-gray-700">{request.refund_payment_mode || request.original_payment_mode || '-'}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-bold capitalize ${
                          request.status === 'completed'
                            ? 'bg-blue-100 text-blue-700'
                            : request.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : request.status === 'declined'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {request.completed_at
                          ? new Date(request.completed_at).toLocaleString()
                          : request.approved_at
                          ? new Date(request.approved_at).toLocaleString()
                          : request.rejected_at
                          ? new Date(request.rejected_at).toLocaleString()
                          : new Date(request.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-3">
                        {request.status === 'approved' ? (
                          <button
                            onClick={() => proceedReturn(request)}
                            disabled={loading}
                            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:bg-gray-400"
                          >
                            Proceed
                          </button>
                        ) : request.status === 'completed' ? (
                          <button
                            onClick={() => setActiveReceipt(request)}
                            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                          >
                            Receipt
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {canReviewRequests && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Pending Return Requests</h2>
                <p className="text-sm text-gray-500">Store admins see their store requests. Super admin sees all stores.</p>
              </div>
              <button
                onClick={loadRequests}
                className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>
            {requests.length === 0 ? (
              <p className="rounded bg-gray-50 p-4 text-sm text-gray-500">No pending return requests.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Request</th>
                      <th className="px-3 py-2">Store</th>
                      <th className="px-3 py-2">Bill</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Refund</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {requests.map((request) => (
                      <tr key={request.id}>
                        <td className="px-3 py-3 font-medium text-gray-900">#{request.id}</td>
                        <td className="px-3 py-3 text-gray-700">{request.store_name || `Store ${request.store_id || '-'}`}</td>
                        <td className="px-3 py-3 text-gray-700">{request.bill_number || request.original_bill_id}</td>
                        <td className="px-3 py-3 capitalize text-gray-700">{request.return_type}</td>
                        <td className="px-3 py-3 font-semibold text-gray-900">Rs.{parseFloat(request.refund_amount || 0).toFixed(2)}</td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => reviewRequest(request.id, 'approve')}
                              disabled={loading}
                              className="rounded bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:bg-gray-400"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => reviewRequest(request.id, 'decline')}
                              disabled={loading}
                              className="rounded bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:bg-gray-400"
                            >
                              Decline
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {canReviewRequests && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Return Product History</h2>
                <p className="text-sm text-gray-500">Completed return receipts for your store access.</p>
              </div>
              <button
                onClick={loadReturnHistory}
                className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>
            {returnHistory.length === 0 ? (
              <p className="rounded bg-gray-50 p-4 text-sm text-gray-500">No completed return history yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Return No.</th>
                      <th className="px-3 py-2">Store</th>
                      <th className="px-3 py-2">Bill</th>
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2">Products</th>
                      <th className="px-3 py-2">Refund</th>
                      <th className="px-3 py-2">Completed</th>
                      <th className="px-3 py-2">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {returnHistory.map((request) => (
                      <tr key={request.id}>
                        <td className="px-3 py-3 font-medium text-gray-900">{request.return_number || `RET-${request.id}`}</td>
                        <td className="px-3 py-3 text-gray-700">{request.store_name || `Store ${request.store_id || '-'}`}</td>
                        <td className="px-3 py-3 text-gray-700">{request.bill_number || request.original_bill_id}</td>
                        <td className="px-3 py-3 text-gray-700">
                          <div className="font-medium text-gray-900">{request.customer_name || 'Walk-in Customer'}</div>
                          <div className="text-xs text-gray-500">{request.customer_mobile || 'No mobile'}</div>
                        </td>
                        <td className="px-3 py-3 text-gray-700">
                          {(request.items || []).slice(0, 2).map((item) => item.product_name).join(', ') || '-'}
                          {(request.items || []).length > 2 ? ` +${request.items.length - 2}` : ''}
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-gray-900">Rs.{parseFloat(request.refund_amount || 0).toFixed(2)}</div>
                          <div className="text-xs capitalize text-gray-500">{request.refund_payment_mode || request.original_payment_mode || 'cash'}</div>
                        </td>
                        <td className="px-3 py-3 text-gray-600">
                          {request.completed_at ? new Date(request.completed_at).toLocaleString() : '-'}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => setActiveReceipt(request)}
                            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Search & Bill Details */}
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Search Bill</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Bill Number / ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.bill_number}
                      onChange={(e) => setFormData({ ...formData, bill_number: e.target.value })}
                      placeholder="Enter bill number..."
                      className="flex-1 border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={searchBill}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium"
                    >
                      Search
                    </button>
                  </div>
                </div>

                {searchedBill && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-4">
                    <h3 className="font-semibold mb-2 text-gray-900">Bill Details</h3>
                    <div className="text-sm space-y-1 text-gray-700">
                      <p><strong className="text-gray-900">Bill ID:</strong> {searchedBill.bill?.id}</p>
                      <p><strong className="text-gray-900">Customer:</strong> {searchedBill.bill?.customer_name || 'Walk-in Customer'} {searchedBill.bill?.customer_mobile ? `(${searchedBill.bill.customer_mobile})` : ''}</p>
                      <p><strong className="text-gray-900">Payment:</strong> <span className="capitalize">{searchedBill.bill?.payment_mode || 'cash'}</span></p>
                      <p><strong className="text-gray-900">Amount:</strong> Rs.{parseFloat(searchedBill.bill?.grand_total || searchedBill.bill?.total_amount || 0).toFixed(2)}</p>
                      <p><strong className="text-gray-900">Date:</strong> {new Date(searchedBill.bill?.created_at).toLocaleString()}</p>
                      <p><strong className="text-gray-900">Items Count:</strong> {searchedBill.items?.length || 0}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Return Type & Reason */}
            {searchedBill && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-900">Return Details</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Return Type</label>
                    <select
                      value={formData.return_type}
                      onChange={(e) => setFormData({ ...formData, return_type: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="return">Return</option>
                      <option value="exchange">Exchange</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Reason</label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      rows="4"
                      placeholder="Enter reason for return..."
                      className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-700"><strong className="text-gray-900">Refund Amount:</strong></p>
                    <p className="text-2xl font-bold text-green-600">Rs.{calculateRefund().toFixed(2)}</p>
                  </div>

                  <button
                    onClick={submitReturn}
                    disabled={loading || selectedItems.length === 0}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 rounded"
                  >
                    {loading ? 'Submitting...' : 'Submit Return Request'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Item Selection */}
          <div>
            {searchedBill && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-900">Select Items to Return</h2>

                {searchedBill.items?.length === 0 ? (
                  <p className="text-gray-500">No items in this bill</p>
                ) : (
                  <div className="space-y-3">
                    {searchedBill.items.map(item => (
                      <div
                        key={item.product_id}
                        className={`border rounded p-3 cursor-pointer transition ${
                          selectedItems.find(i => i.product_id === item.product_id)
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedItems.some(i => i.product_id === item.product_id)}
                            onChange={() => toggleItemSelection(item)}
                            className="mt-1"
                          />

                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{item.name}</h4>
                            <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                            <p className="text-sm text-gray-700">
                              Qty Purchased: {item.qty} | Price: Rs.{parseFloat(item.selling_price).toFixed(2)}
                            </p>

                            {selectedItems.find(i => i.product_id === item.product_id) && (
                              <div className="mt-2">
                                <label className="block text-xs font-medium mb-1 text-gray-700">Return Qty</label>
                                <input
                                  type="number"
                                  min="1"
                                  max={item.qty}
                                  value={selectedItems.find(i => i.product_id === item.product_id)?.return_qty || 1}
                                  onChange={(e) => updateReturnQty(item.product_id, parseInt(e.target.value))}
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-900"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedItems.length > 0 && (
                  <div className="mt-4 bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-700">
                      <strong className="text-gray-900">{selectedItems.length}</strong> item(s) selected for return
                    </p>
                  </div>
                )}
              </div>
            )}

            {!searchedBill && (
              <div className="bg-gray-50 rounded-lg p-12 text-center">
                <p className="text-gray-500">Search a bill to view items</p>
              </div>
            )}
          </div>
        </div>

        {activeReceipt && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Return Product Receipt</h2>
                  <p className="text-sm text-gray-500">
                    {getReceiptDetails(activeReceipt).returnNumber || activeReceipt.return_number || `RET-${activeReceipt.id}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveReceipt(null)}
                  className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
                >
                  <i className="ti ti-x text-lg" />
                </button>
              </div>

              <div className="max-h-[75vh] overflow-auto p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded border border-gray-200 p-3">
                    <p className="text-xs font-bold uppercase text-gray-500">Customer</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {getReceiptDetails(activeReceipt).customerName || activeReceipt.customer_name || 'Walk-in Customer'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {getReceiptDetails(activeReceipt).customerMobile || activeReceipt.customer_mobile || 'No mobile'}
                    </p>
                  </div>
                  <div className="rounded border border-gray-200 p-3">
                    <p className="text-xs font-bold uppercase text-gray-500">Original Bill</p>
                    <p className="mt-1 font-semibold text-gray-900">{activeReceipt.bill_number || activeReceipt.original_bill_id}</p>
                    <p className="text-sm capitalize text-gray-600">
                      Paid by {activeReceipt.original_payment_mode || 'cash'}
                    </p>
                  </div>
                  <div className="rounded border border-gray-200 p-3">
                    <p className="text-xs font-bold uppercase text-gray-500">Refund</p>
                    <p className="mt-1 text-xl font-bold text-green-700">
                      Rs.{Number(activeReceipt.refund_amount || getReceiptDetails(activeReceipt).refundAmount || 0).toFixed(2)}
                    </p>
                    <p className="text-sm capitalize text-gray-600">
                      {activeReceipt.refund_payment_mode || getReceiptDetails(activeReceipt).refundPaymentMode || activeReceipt.original_payment_mode || 'cash'}
                    </p>
                  </div>
                  <div className="rounded border border-gray-200 p-3">
                    <p className="text-xs font-bold uppercase text-gray-500">Processed</p>
                    <p className="mt-1 font-semibold text-gray-900">{activeReceipt.completed_by_name || user?.name || '-'}</p>
                    <p className="text-sm text-gray-600">
                      {activeReceipt.completed_at
                        ? new Date(activeReceipt.completed_at).toLocaleString()
                        : getReceiptDetails(activeReceipt).completedAt
                        ? new Date(getReceiptDetails(activeReceipt).completedAt).toLocaleString()
                        : '-'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-3 py-2">Product</th>
                        <th className="px-3 py-2">Qty</th>
                        <th className="px-3 py-2">Price</th>
                        <th className="px-3 py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(activeReceipt.items || []).map((item) => (
                        <tr key={item.id || item.product_id}>
                          <td className="px-3 py-3 text-gray-900">
                            <div className="font-medium">{item.product_name || item.name || 'Product'}</div>
                            <div className="text-xs text-gray-500">{item.sku || ''}</div>
                          </td>
                          <td className="px-3 py-3 text-gray-700">{Number(item.qty || 0)}</td>
                          <td className="px-3 py-3 text-gray-700">Rs.{Number(item.original_price || item.selling_price || 0).toFixed(2)}</td>
                          <td className="px-3 py-3 font-semibold text-gray-900">
                            Rs.{Number(item.line_total || ((item.qty || 0) * (item.original_price || item.selling_price || 0))).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Print
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveReceipt(null)}
                    className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
