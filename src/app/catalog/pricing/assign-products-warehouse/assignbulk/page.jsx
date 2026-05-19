"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

export default function AssignBulkPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [stores, setStores] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [storeRes, whRes, catRes] = await Promise.all([
          fetch('/api/stores'),
          fetch('/api/warehouses'),
          fetch('/api/catalog/categories?pageSize=200'),
        ]);
        const [storeJson, whJson, catJson] = await Promise.all([storeRes.json(), whRes.json(), catRes.json()]);
        if (storeJson?.success) setStores(storeJson.data?.records || []);
        if (whJson?.success) setWarehouses(whJson.data?.records || []);
        if (catJson?.success) setCategoryList(catJson.data?.records || []);
      } catch (e) { }
    })();
  }, []);

  const downloadTemplate = () => {
    const headers = [['product_id','barcode','sku','quantity','location']];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(headers);
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `assign-products-warehouse-template.xlsx`);
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

  const startPreview = () => {
    if (!selectedStoreId) return alert('Select a store');
    if (!selectedWarehouseIds.length) return alert('Select at least one warehouse');
    if (!rows || !rows.length) return alert('Please upload a template file first');
    sessionStorage.setItem('assignBulkWarehouse_preview_rows', JSON.stringify(rows));
    sessionStorage.setItem('assignBulkWarehouse_preview_store', String(selectedStoreId));
    sessionStorage.setItem('assignBulkWarehouse_preview_warehouses', JSON.stringify(selectedWarehouseIds));
    router.push('/catalog/pricing/assign-products-warehouse/assignbulk/preview');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-xl font-semibold">Assign Products to Warehouse — Bulk</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => window.history.back()} className="px-3 py-2 border rounded-md text-sm">Back</button>
          <button onClick={startPreview} disabled={!(selectedWarehouseIds.length && rows && rows.length)} className={`px-3 py-2 rounded-md text-sm text-white ${selectedWarehouseIds.length && rows && rows.length ? 'bg-blue-600' : 'bg-slate-300'}`}>Next</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg mb-6 shadow-sm">
        <h3 className="font-semibold mb-3 text-gray-700">Please Select Warehouses</h3>
        <div className="grid grid-cols-12 gap-4 items-end">
          <div className="col-span-4">
            <label className="text-sm text-gray-600 mb-1 block">Store</label>
            <select value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white">
              <option value="">select</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="col-span-4 relative">
            <label className="text-sm text-gray-600 mb-1 block">Warehouses</label>
            <div className="relative">
              <button type="button" onClick={() => setDropdownOpen(o => !o)}
                className="w-full text-left border border-slate-200 rounded-md px-3 py-2 bg-white flex items-center justify-between">
                <span className="text-sm text-gray-700">{selectedWarehouseIds.length ? `${selectedWarehouseIds.length} warehouse(s) selected` : 'Select warehouses'}</span>
                <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>

              {dropdownOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg max-h-60 overflow-auto">
                  <div className="p-2">
                    {warehouses.map(w => (
                      <label key={w.id} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded">
                        <input type="checkbox" checked={selectedWarehouseIds.includes(String(w.id))}
                          onChange={e => {
                            const id = String(w.id);
                            setSelectedWarehouseIds(prev => e.target.checked ? [...prev.filter(x=>x!==id), id] : prev.filter(x=>x!==id));
                          }}
                        />
                        <span className="text-sm text-gray-700">{w.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="col-span-4">
            <label className="text-sm text-gray-600 mb-1 block">Category (optional)</label>
            <select className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white">
              <option value="">Any</option>
              {categoryList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
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
        <button onClick={startPreview} className={`px-4 py-2 rounded-md text-white ${selectedWarehouseIds.length && rows && rows.length ? 'bg-blue-600' : 'bg-slate-300'}`} disabled={!(selectedWarehouseIds.length && rows && rows.length)}>Next</button>
      </div>
    </div>
  );
}
