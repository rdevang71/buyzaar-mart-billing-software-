"use client";

import MainLayout from '@/components/MainLayout';

export default function DeviceSyncLogsPage() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">Device Sync Logs</h1>
      <p className="text-sm text-gray-600 mt-2">View device synchronization logs.</p>
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
        { label: 'Device Sync Logs' },
      ]}
      title="Device Sync Logs"
      description="View device synchronization logs. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="Device Sync Logs(s)"
      emptyMessage="No records found"
    />
  );
}