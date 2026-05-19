"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import CatalogListPage from "@/components/CatalogListPage";

const columns = [
  { key: "sno",              label: "S. No.",          sortable: true },
  { key: "product_id",       label: "Product ID",      sortable: true },
  { key: "product_name",     label: "Product Name",    sortable: true },
  { key: "sku",              label: "SKU",             sortable: true },
  { key: "safe_stock_level", label: "Safe Stock Level",sortable: true },
  { key: "low_stock_level",  label: "Low Stock Level", sortable: true },
];

const stores = [];

export default function AssignProductsToWarehousePage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/warehouses');
        const json = await res.json();
        if (json.success) setWarehouses(json.data.records || []);
      } catch (e) { /* ignore */ }
    })();
  }, []);

  const handleStoreChange = (storeId) => {
    // TODO: fetch products for selected warehouse
    setRows([]);
  };

  const handleBulkCreate = () => router.push('/catalog/pricing/assign-products-warehouse/assignbulk');

  return (
    <CatalogListPage
      breadcrumbs={[
        { label: "Catalog", href: "/catalog" },
        { label: "Pricing",  href: "/catalog/pricing" },
        { label: "Assign Products To Warehouse" },
      ]}
      title="Assign Product To Warehouse"
      description="Map/Unmap products to warehouse Need Help?"
        createLabel={'Bulk Create'}
        onCreateClick={handleBulkCreate}
        bulkOperations={false}
      showStoreSelector={true}
      selectorLabel={null}
      selectorPlaceholder="None"
      stores={warehouses}
      onStoreChange={handleStoreChange}
      columns={columns}
      rows={rows}
      totalLabel="Product(s)"
      emptyMessage="No Records Found"
    />
  );
}