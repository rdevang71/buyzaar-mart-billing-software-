"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

export default function AssignGroupsBulk() {
  const router = useRouter();
  const [stores, setStores] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedStores, setSelectedStores] = useState([]);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const fileRef = useRef();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [storesRes, catRes, whRes] = await Promise.all([fetch('/api/stores'), fetch('/api/catalog/categories?pageSize=200'), fetch('/api/warehouses')]);
        const [storesJson, catJson, whJson] = await Promise.all([storesRes.json(), catRes.json(), whRes.json()]);
        if (storesJson?.success) setStores(storesJson.data?.records || []);
        if (catJson?.success) setCategories(catJson.data?.records || []);
        if (whJson?.success) setWarehouses(whJson.data?.records || []);
      } catch (e) {}
    })();
  }, []);

  const downloadTemplate = () => {
    const headers = [['product_id','barcode','sku']];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(headers);
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `assign-product-groups-template.xlsx`);
  };

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name || '');
    const data = await f.arrayBuffer();
    const wb = XLSX.read(data);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const parsed = XLSX.utils.sheet_to_json(ws, { defval: '' });
    setRows(parsed);
  };

  const handleNext = () => {
    if (!selectedStores.length) return alert('Select at least one store');
    if (!rows.length) return alert('Upload template first');
    sessionStorage.setItem('assignGroups_preview_rows', JSON.stringify(rows));
    sessionStorage.setItem('assignGroups_preview_stores', JSON.stringify(selectedStores));
    router.push('/catalog/pricing/assign-groups-store/assignbulk/preview');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-xl font-semibold mb-6">Bulk Operation</h2>
      <div className="bg-white p-6 rounded-lg mb-6 shadow-sm">
        <h3 className="font-semibold mb-3 text-gray-700">Please Select Up to 50 Stores</h3>
        <div className="grid grid-cols-12 gap-4 items-end">
          <div className="col-span-5 relative">
            <label className="text-sm text-gray-600 mb-1 block">Stores</label>
            <div className="relative">
              <button type="button" onClick={() => setDropdownOpen(o => !o)}
                className="w-full text-left border border-slate-200 rounded-md px-3 py-2 bg-white flex items-center justify-between">
                <span className="text-sm text-gray-700">{selectedStores.length ? `${selectedStores.length} store(s) selected` : 'Select stores'}</span>
                <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>

              {dropdownOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg max-h-60 overflow-auto">
                  <div className="p-2">
                    {stores.map(s => (
                      <label key={s.id} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded">
                        <input type="checkbox" checked={selectedStores.includes(String(s.id))}
                          onChange={e => {
                            const id = String(s.id);
                            setSelectedStores(prev => e.target.checked ? [...prev.filter(x=>x!==id), id] : prev.filter(x=>x!==id));
                          }}
                        />
                        <span className="text-sm text-gray-700">{s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="col-span-4">
            <label className="text-sm text-gray-600 mb-1 block">Warehouse</label>
            <select className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white">
              <option value="">select</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div className="col-span-3">
            <label className="text-sm text-gray-600 mb-1 block">Category</label>
            <select className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white">
              <option value="">select</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button onClick={downloadTemplate} className="px-4 py-2 bg-blue-600 text-white rounded-md">Download Template</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="font-semibold mb-3 text-gray-700">Upload Template</h3>
        <div className="border border-dashed border-yellow-200 bg-yellow-50 p-8 text-center rounded">
          <div className="mb-3 text-sm text-gray-600">{fileName || 'Choose File'}</div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="mx-auto" />
          <div className="text-sm text-gray-600 mt-2">Rows parsed: {rows.length}</div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <button onClick={() => window.history.back()} className="px-4 py-2 border rounded-md">Back</button>
        <button onClick={handleNext} className={`px-4 py-2 rounded-md text-white ${selectedStores.length && rows && rows.length ? 'bg-blue-600' : 'bg-slate-300'}`} disabled={!(selectedStores.length && rows && rows.length)}>Next</button>
      </div>
    </div>
  );
}
