"use client";

import { useEffect, useState } from 'react';

export default function AssignGroupsPreview() {
  const [stores, setStores] = useState([]);
  const [storeIds, setStoreIds] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupIds, setGroupIds] = useState([]);
  const [preview, setPreview] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    const s = JSON.parse(sessionStorage.getItem('assignGroups_preview_stores') || '[]');
    const r = JSON.parse(sessionStorage.getItem('assignGroups_preview_rows') || '[]');
    setStoreIds(s);
    setGroupIds([]);

    (async () => {
      try {
        const res = await fetch('/api/stores');
        const json = await res.json();
        if (json.success) setStores(json.data.records || []);
      } catch (e) { }

      try {
        // reuse product preview matcher used by assign-products-store
        const res2 = await fetch('/api/catalog/assign-products-store/bulk/preview', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: r })
        });
        const j2 = await res2.json();
        if (j2.success) setPreview(j2.data.records || []);
      } catch (e) { setPreview([]); }
    })();
  }, []);

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id]);

  const doApply = async () => {
    if (!storeIds.length) return alert('No stores selected');
    if (!selectedIds.length) return alert('Select at least one product');
    const res = await fetch('/api/catalog/assign-product-groups-store/bulk/execute', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productIds: selectedIds, storeIds })
    });
    const json = await res.json();
    if (json.success) {
      alert('Bulk operation completed');
      window.location.href = '/catalog/pricing/assign-groups-store';
    } else alert(json.message || 'Failed');
  };

  const storeNames = storeIds.map(id => stores.find(s => String(s.id) === String(id))?.name).filter(Boolean);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Bulk Operation — Preview (Groups)</h2>
      <div className="bg-white p-4 rounded-lg mb-4 shadow-sm">
        <div className="text-sm text-gray-600">Stores: {storeNames.length ? storeNames.join(', ') : storeIds.join(', ')}</div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b"><th className="w-8"></th><th>Product ID</th><th>Name</th><th>SKU</th><th>Barcode</th></tr>
          </thead>
          <tbody>
            {preview.map(p => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="px-2 py-2 text-center"><input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                <td className="px-2 py-2">{p.id}</td>
                <td className="px-2 py-2">{p.name}</td>
                <td className="px-2 py-2">{p.sku}</td>
                <td className="px-2 py-2">{p.barcode}</td>
              </tr>
            ))}
            {preview.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">No matching products found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <button onClick={() => window.history.back()} className="px-4 py-2 border rounded-md">Back</button>
        <button onClick={doApply} className={`px-4 py-2 rounded-md text-white ${selectedIds.length ? 'bg-blue-600' : 'bg-slate-300'}`} disabled={!selectedIds.length}>Apply</button>
      </div>
    </div>
  );
}
