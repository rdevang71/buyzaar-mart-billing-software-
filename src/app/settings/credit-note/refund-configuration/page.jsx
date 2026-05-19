"use client";

import MainLayout from '@/components/MainLayout';

export default function RefundConfigurationPage() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">Refund Configuration</h1>
      <p className="text-sm text-gray-600 mt-2">Configure refund rules for credit notes and returns.</p>
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
        { label: 'Credit Note Configuration' },
        { label: 'Refund Configuration' },
      ]}
      title="Refund Configuration"
      description="Configure refund rules for credit notes. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="Refund Configuration(s)"
      emptyMessage="No records found"
    />
  );
}