"use client";

import MainLayout from '@/components/MainLayout';

export default function InventorySystemAttributesPage() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">Inventory System Attributes</h1>
      <p className="text-sm text-gray-600 mt-2">Configure system-level inventory attributes.</p>
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
        { label: 'System Attributes' },
      ]}
      title="System Attributes"
      description="Built-in inventory attributes. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="System Attributes(s)"
      emptyMessage="No records found"
    />
  );
}