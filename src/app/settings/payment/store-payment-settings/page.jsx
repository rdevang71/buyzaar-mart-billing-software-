"use client";

import MainLayout from '@/components/MainLayout';

export default function StorePaymentSettingsPage() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">Store Payment Settings</h1>
      <p className="text-sm text-gray-600 mt-2">Configure payment methods and settings per store.</p>
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
        { label: 'Payment Configuration' },
        { label: 'Store Payment Settings' },
      ]}
      title="Store Payment Settings"
      description="Configure store-level payment settings. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="Store Payment Settings(s)"
      emptyMessage="No records found"
    />
  );
}