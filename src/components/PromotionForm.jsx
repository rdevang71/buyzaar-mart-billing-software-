"use client";
import { useState, useEffect } from 'react';

export default function PromotionForm({ onClose, initial = null, onSaved = null }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('Discount');
  const [discount, setDiscount] = useState('0');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [storeId, setStoreId] = useState('');
  const [discountAppliedOn, setDiscountAppliedOn] = useState('ORDER');
  const [maxRepeatCount, setMaxRepeatCount] = useState(0);
  const [useForCustomer, setUseForCustomer] = useState(false);
  const [removeOtherDiscounts, setRemoveOtherDiscounts] = useState(false);
  const [isAutoApplied, setIsAutoApplied] = useState(false);
  const [minCartValue, setMinCartValue] = useState('0');
  const [maxDiscountValue, setMaxDiscountValue] = useState('0');
  const [applyAfterTax, setApplyAfterTax] = useState(false);
  const [allowMerging, setAllowMerging] = useState(false);
  const [applyOnProductMrp, setApplyOnProductMrp] = useState(false);
  const [products, setProducts] = useState('');
  const [couponEnabled, setCouponEnabled] = useState(false);
  const [promotionSlotsEnabled, setPromotionSlotsEnabled] = useState(false);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Active');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // initialize state when editing
  useEffect(() => {
    if (!initial) return;
    try {
      setName(initial.name ?? initial.title ?? '');
      setType(initial.promotion_type || initial.type || 'Discount');
      setDiscount(initial.discount_value ?? initial.discount ?? '0');
      setStartDate(initial.start_date ?? initial.start ?? '');
      setEndDate(initial.end_date ?? initial.end ?? '');
      setStoreId(initial.store_id ?? '');
      setDiscountAppliedOn(initial.discount_applied_on ?? 'ORDER');
      setMaxRepeatCount(initial.max_repeat_count ?? 0);
      setUseForCustomer(!!initial.use_for_customer);
      setRemoveOtherDiscounts(!!initial.remove_other_discounts);
      setIsAutoApplied(!!initial.is_auto_applied);
      setMinCartValue(initial.min_cart_value ?? 0);
      setMaxDiscountValue(initial.max_discount_value ?? 0);
      setApplyAfterTax(!!initial.apply_after_tax);
      setAllowMerging(!!initial.allow_merging);
      setApplyOnProductMrp(!!initial.apply_on_product_mrp);
      setProducts(Array.isArray(initial.products) ? initial.products.join(',') : initial.products || '');
      setCouponEnabled(!!initial.coupon_enabled);
      setPromotionSlotsEnabled(!!initial.promotion_slots_enabled);
      setDescription(initial.description || '');
      setStatus(initial.status || 'Active');
    } catch (e) {}
  }, [initial]);

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) return setError('Promotion name is required');
    if (!startDate || !endDate) return setError('Date range is required');

    setSaving(true);
    try {
      const isEdit = initial && initial.id;
      const url = isEdit ? `/api/catalog/promotions/${initial.id}` : '/api/catalog/promotions';
      const method = isEdit ? 'PUT' : 'POST';
      const bodyStatus = isEdit ? status : 'Pending';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          promotion_type: type,
          discount_value: discount,
          start_date: startDate,
          end_date: endDate,
          status: bodyStatus,
          store_id: storeId || null,
          discount_applied_on: discountAppliedOn,
          max_repeat_count: Number(maxRepeatCount || 0),
          use_for_customer: useForCustomer,
          remove_other_discounts: removeOtherDiscounts,
          is_auto_applied: isAutoApplied,
          min_cart_value: Number(minCartValue || 0),
          max_discount_value: Number(maxDiscountValue || 0),
          apply_after_tax: applyAfterTax,
          allow_merging: allowMerging,
          apply_on_product_mrp: applyOnProductMrp,
          description: description || null,
          products: products || null,
          coupon_enabled: couponEnabled,
          promotion_slots_enabled: promotionSlotsEnabled,
        }),
      });

      const json = await res.json();
      if (json.success) {
        if (onSaved) {
          onSaved(json.data, isEdit);
          // parent will handle closing / notification
        } else {
          // default behavior: show message for creations, reload for edits
          if (!isEdit) {
            alert('Your promotion has been sent for approval');
            onClose?.();
          } else {
            window.location.reload();
          }
        }
      } else {
        setError(json.message || 'Save failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center overflow-auto py-8 bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[900px] max-w-full max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Create Promotion</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">Close</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Promotion Name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Date Range *</label>
            <div className="flex gap-2">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="border border-gray-200 rounded px-3 py-2 text-sm w-1/2" />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="border border-gray-200 rounded px-3 py-2 text-sm w-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Discount Type</label>
            <select value={type} onChange={e => setType(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm">
              <option>Discount</option>
              <option>Conditional</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Discount Value</label>
            <input value={discount} onChange={e => setDiscount(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm">
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Store ID</label>
            <input value={storeId} onChange={e => setStoreId(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Discount Applied On</label>
            <select value={discountAppliedOn} onChange={e => setDiscountAppliedOn(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm">
              <option value="ORDER">Order</option>
              <option value="PRODUCT">Product</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Max Repeat Count</label>
            <input type="number" value={maxRepeatCount} onChange={e => setMaxRepeatCount(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Use For Customer</label>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={useForCustomer} onChange={e => setUseForCustomer(e.target.checked)} />
              <span className="text-xs text-gray-600">Restrict to specific customers</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Remove Other Discounts</label>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={removeOtherDiscounts} onChange={e => setRemoveOtherDiscounts(e.target.checked)} />
              <span className="text-xs text-gray-600">Prevent stacking with other discounts</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Auto Apply</label>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={isAutoApplied} onChange={e => setIsAutoApplied(e.target.checked)} />
              <span className="text-xs text-gray-600">Apply automatically (no coupon)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Min Cart Value</label>
            <input value={minCartValue} onChange={e => setMinCartValue(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Maximum discount value</label>
            <input value={maxDiscountValue} onChange={e => setMaxDiscountValue(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Apply After Tax</label>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={applyAfterTax} onChange={e => setApplyAfterTax(e.target.checked)} />
              <span className="text-xs text-gray-600">Apply discount after tax calculation</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Allow Merging With Other Discounts</label>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={allowMerging} onChange={e => setAllowMerging(e.target.checked)} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Apply On Product MRP</label>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={applyOnProductMrp} onChange={e => setApplyOnProductMrp(e.target.checked)} />
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-gray-600 mb-1">Products (comma-separated IDs)</label>
            <textarea value={products} onChange={e => setProducts(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm" rows={2} />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Coupon Enabled</label>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={couponEnabled} onChange={e => setCouponEnabled(e.target.checked)} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Promotion Slots</label>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={promotionSlotsEnabled} onChange={e => setPromotionSlotsEnabled(e.target.checked)} />
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-gray-600 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm" rows={3} />
          </div>
        </div>

        {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
