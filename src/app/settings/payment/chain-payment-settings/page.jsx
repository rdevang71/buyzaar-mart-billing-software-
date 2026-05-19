"use client";

import MainLayout from '@/components/MainLayout';

 function ChainPaymentSettingsPage() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">Chain Payment Settings</h1>
      <p className="text-sm text-gray-600 mt-2">Configure chain-level payment integrations and defaults.</p>
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
        { label: 'Chain Payment Settings' },
      ]}
      title="Chain Payment Settings"
      description="Configure chain-wide payment settings. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="Chain Payment Settings(s)"
      emptyMessage="No records found"
    />
  );
}