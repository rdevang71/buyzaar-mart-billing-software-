"use client";

import MainLayout from '@/components/MainLayout';

export default function ChainAttributesPage() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">Chain Attributes</h1>
      <p className="text-sm text-gray-600 mt-2">Manage attributes shared across the chain of stores.</p>
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
        { label: 'Billing' },
        { label: 'Chain Attributes' },
      ]}
      title="Chain Attributes"
      description="Manage chain-level attributes. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="Chain Attributes(s)"
      emptyMessage="No records found"
    />
  );
}