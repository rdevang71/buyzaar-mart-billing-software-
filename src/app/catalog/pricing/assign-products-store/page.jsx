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


export default function AssignProductsToStorePage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [storesList, setStoresList] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/stores');
        const json = await res.json();
        if (json.success) setStoresList(json.data.records || json.data.stores || []);
      } catch (e) { /* ignore */ }
    })();
  }, []);

  const handleStoreChange = (storeId) => {
    // TODO: fetch products for selected store
    setRows([]);
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
      totalLabel="Product(s)"
      emptyMessage="No Records Found"
    />
  );
}