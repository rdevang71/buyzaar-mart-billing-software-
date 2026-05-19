"use client";

import MainLayout from '@/components/MainLayout';

export default function ApplicationDeviceSettingsPage() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">Application Device Settings</h1>
      <p className="text-sm text-gray-600 mt-2">Configure application-level device settings.</p>
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
        { label: 'Application Device Settings' },
      ]}
      title="Application Device Settings"
      description="Configure application device settings. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="Application Device Settings(s)"
      emptyMessage="No records found"
    />
  );
}