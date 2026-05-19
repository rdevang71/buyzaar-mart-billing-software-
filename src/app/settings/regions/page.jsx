"use client";

import MainLayout from '@/components/MainLayout';

export default function RegionsPage() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">Regions</h1>
      <p className="text-sm text-gray-600 mt-2">Manage geographical regions for stores and reporting.</p>
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
        { label: 'Regions' },
      ]}
      title="Regions"
      description="Geography groupings for reporting. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="Regions(s)"
      emptyMessage="No records found"
    />
  );
}