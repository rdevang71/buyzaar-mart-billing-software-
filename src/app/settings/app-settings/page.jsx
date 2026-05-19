"use client";

import MainLayout from '@/components/MainLayout';

export default function AppSettingsPage() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">App Settings</h1>
      <p className="text-sm text-gray-600 mt-2">Application-level settings and feature toggles.</p>
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
        { label: 'App Settings' },
      ]}
      title="App Settings"
      description="POS app behaviour and feature toggles. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="App Settings(s)"
      emptyMessage="No records found"
    />
  );
}