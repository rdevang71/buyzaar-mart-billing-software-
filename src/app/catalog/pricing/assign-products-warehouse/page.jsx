"use client";

import { useState } from "react";
import CatalogListPage from "@/components/CatalogListPage";

const columns = [
  { key: "sno",              label: "S. No.",          sortable: true },
  { key: "product_id",       label: "Product ID",      sortable: true },
  { key: "product_name",     label: "Product Name",    sortable: true },
  { key: "sku",              label: "SKU",             sortable: true },
  { key: "safe_stock_level", label: "Safe Stock Level",sortable: true },
  { key: "low_stock_level",  label: "Low Stock Level", sortable: true },
];

const stores = [
  { id: "wh_1", name: "Warehouse A" },
  { id: "wh_2", name: "Warehouse B" },
  { id: "wh_3", name: "Warehouse C" },
];

export default function AssignProductsToWarehousePage() {
  const [rows, setRows] = useState([]);

  const handleStoreChange = (storeId) => {
    // TODO: fetch products for selected warehouse
    setRows([]);
  };

  return (
    <CatalogListPage
      breadcrumbs={[
        { label: "Catalog", href: "/catalog" },
        { label: "Pricing",  href: "/catalog/pricing" },
        { label: "Assign Products To Warehouse" },
      ]}
      title="Assign Product To Warehouse"
      description="Map/Unmap products to warehouse Need Help?"
      createLabel={null}
      bulkOperations={true}
      showStoreSelector={true}
      selectorLabel={null}
      selectorPlaceholder="None"
      stores={stores}
      onStoreChange={handleStoreChange}
      columns={columns}
      rows={rows}
      totalLabel="Product(s)"
      emptyMessage="No Records Found"
    />
  );
}