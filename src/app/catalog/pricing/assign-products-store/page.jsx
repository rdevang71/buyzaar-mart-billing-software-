"use client";

import { useState } from "react";
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

const stores = [
  { id: "store_1", name: "Store A" },
  { id: "store_2", name: "Store B" },
  { id: "store_3", name: "Store C" },
];

export default function AssignProductsToStorePage() {
  const [rows, setRows] = useState([]);

  const handleStoreChange = (storeId) => {
    // TODO: fetch products for selected store
    setRows([]);
  };

  return (
    <CatalogListPage
      breadcrumbs={[
        { label: "Catalog", href: "/catalog" },
        { label: "Pricing",  href: "/catalog/pricing" },
        { label: "Assign products to store" },
      ]}
      title="Assign Product To Store"
      description="Map/Unmap products to store Need Help?"
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