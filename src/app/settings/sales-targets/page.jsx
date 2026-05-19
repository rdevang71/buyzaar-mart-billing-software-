"use client";

import MainLayout from '@/components/MainLayout';

export default function SalesTargetsPage() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">Sales Targets</h1>
      <p className="text-sm text-gray-600 mt-2">Set and monitor sales targets for users and stores.</p>
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
        { label: 'Sales Targets' },
      ]}
      title="Sales Targets"
      description="Monthly goals per store and per staff. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="Sales Targets(s)"
      emptyMessage="No records found"
    />
  );
}