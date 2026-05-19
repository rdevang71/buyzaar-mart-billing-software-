"use client";

import MainLayout from '@/components/MainLayout';

export default function DeviceDataSyncPage() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">Device Data Sync</h1>
      <p className="text-sm text-gray-600 mt-2">Trigger or monitor device data synchronization.</p>
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
        { label: 'Device Data Sync' },
      ]}
      title="Device Data Sync"
      description="Manage device data synchronization. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="Device Data Sync(s)"
      emptyMessage="No records found"
    />
  );
}