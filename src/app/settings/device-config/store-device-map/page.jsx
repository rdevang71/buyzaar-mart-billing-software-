"use client";

import MainLayout from '@/components/MainLayout';

export default function StoreDeviceMapPage() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">Store Device Map</h1>
      <p className="text-sm text-gray-600 mt-2">Map devices to stores and counters.</p>
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
        { label: 'Device Config' },
        { label: 'Store Device Map' },
      ]}
      title="Store Device Map"
      description="Map devices to stores. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="Store Device Map(s)"
      emptyMessage="No records found"
    />
  );
}