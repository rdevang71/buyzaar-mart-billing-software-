"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import CatalogListPage from "@/components/CatalogListPage";

const columns = [
  { key: "sno",              label: "S. No.",          sortable: true },
  { key: "product_id",       label: "Product ID",      sortable: true },
  { key: "product_name",     label: "Product Name",    sortable: true },
  { key: "barcode",          label: "Barcode",         sortable: true },
  { key: "sku",              label: "SKU",             sortable: true },
  { key: "safe_stock_level", label: "Safe Stock Level",sortable: true },
  { key: "low_stock_level",  label: "Low Stock Level", sortable: true },
  { key: "mrp",              label: "M.R.P",           sortable: true },
  { key: "selling_price",    label: "Selling Price",   sortable: true },
  { key: "sell_on_store",    label: "Sell on Store",   sortable: true },
];

function mapRows(records = []) {
  return records.map((item, index) => ({
    id: item.id,
    sno: index + 1,
    product_id: item.product_id || item.id,
    product_name: item.name,
    barcode: item.barcode || "-",
    sku: item.sku || "-",
    safe_stock_level: item.safe_stock_level ?? 0,
    low_stock_level: item.low_stock_level ?? 0,
    mrp: item.store_mrp ?? item.mrp ?? 0,
    selling_price: item.store_selling_price ?? item.selling_price ?? 0,
    sell_on_store: item.is_assigned ? "Yes" : "No",
    is_assigned: Boolean(item.is_assigned),
  }));
}

export default function AssignProductsToStorePage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [storesList, setStoresList] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/stores');
        const json = await res.json();
        if (json.success) setStoresList(json.data.records || json.data.stores || []);
      } catch (e) { /* ignore */ }
    })();
  }, []);

  const handleStoreChange = async (storeId) => {
    setSelectedStoreId(storeId || '');
    if (!storeId) { setRows([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/catalog/assign-products-store?storeId=${encodeURIComponent(storeId)}`);
      const json = await res.json();
      setRows(json.success ? mapRows(json.data.records || []) : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (row) => {
    if (!selectedStoreId) return alert('Select a store first');
    const res = await fetch('/api/catalog/assign-products-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: row.id, storeId: selectedStoreId, assign: !row.is_assigned }),
    });
    const json = await res.json();
    if (!json.success) return alert(json.message || 'Failed to update product assignment');
    handleStoreChange(selectedStoreId);
  };

  const handleBulkCreate = () => router.push('/catalog/pricing/assign-products-store/assignbulk');

  return (
    <CatalogListPage
      breadcrumbs={[
        { label: "Catalog", href: "/catalog" },
        { label: "Pricing",  href: "/catalog/pricing" },
        { label: "Assign products to store" },
      ]}
      title="Assign Product To Store"
      description="Map/Unmap products to store Need Help?"
        createLabel={'Bulk Create'}
      onCreateClick={handleBulkCreate}
      bulkImportType={'products'}
      onImportSuccess={() => setRows([])}
        bulkOperations={false}
      showStoreSelector={true}
      selectorLabel={null}
      selectorPlaceholder="None"
      stores={storesList}
      onStoreChange={handleStoreChange}
      columns={columns}
      rows={rows}
      loading={loading}
      totalLabel="Product(s)"
      emptyMessage="No Records Found"
      showRowActions={true}
      onEdit={handleToggle}
    />
  );
}
