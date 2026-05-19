"use client";

import MainLayout from '@/components/MainLayout';

export default function InventoryCustomAttributesPage() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">Inventory Custom Attributes</h1>
      <p className="text-sm text-gray-600 mt-2">Manage custom attributes for products and inventory.</p>
    </MainLayout>
  );
}
'use client';

import CatalogListPage from '@/components/CatalogListPage';

export default function Page() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Home', href: '/home' },
        { label: 'Settings', href: '/settings' },
        { label: 'Inventory' },
        { label: 'Custom Attributes' },
      ]}
      title="Custom Attributes"
      description="Your own inventory attributes. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="Custom Attributes(s)"
      emptyMessage="No records found"
    />
  );
}