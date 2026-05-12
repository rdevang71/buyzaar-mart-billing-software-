"use client";

import { useState } from "react";
import CatalogListPage from "@/components/CatalogListPage";

const columns = [
  { key: "product_group_id",   label: "Product Group ID",   sortable: true },
  { key: "product_group_name", label: "Product Group Name", sortable: true },
  { key: "product_id",         label: "Product ID",         sortable: true },
  { key: "product_name",       label: "Product Name",       sortable: true },
  { key: "barcode",            label: "Barcode",            sortable: true },
  { key: "serial_number",      label: "Serial Number",      sortable: true },
  { key: "mrp",                label: "MRP",                sortable: true },
];

const stores = [
  { id: "store_1", name: "Store A" },
  { id: "store_2", name: "Store B" },
  { id: "store_3", name: "Store C" },
];

export default function AssignProductGroupsToStorePage() {
  const [rows, setRows] = useState([]);

  const handleStoreChange = (storeId) => {
    // TODO: fetch product groups for selected store
    setRows([]);
  };

  return (
    <CatalogListPage
      breadcrumbs={[
        { label: "Catalog", href: "/catalog" },
        { label: "Pricing",  href: "/catalog/pricing" },
        { label: "Assign product groups to store" },
      ]}
      title="Assign Product Group to Store"
      description="Map product groups to stores Need Help?"
      createLabel={null}
      bulkOperations={true}
      showStoreSelector={true}
      selectorLabel="Select Store"
      selectorPlaceholder="None"
      stores={stores}
      onStoreChange={handleStoreChange}
      columns={columns}
      rows={rows}
      totalLabel="Product Group(s)"
      emptyMessage="No data found"
    />
  );
}