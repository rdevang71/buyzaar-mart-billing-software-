"use client";

import MainLayout from '@/components/MainLayout';

export default function MeasurementUnitPage() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">Measurement Unit</h1>
      <p className="text-sm text-gray-600 mt-2">Manage units of measurement used in inventory.</p>
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
        { label: 'Inventory' },
        { label: 'Measurement Unit' },
      ]}
      title="Measurement Unit"
      description="Units of measurement for products. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="Measurement Unit(s)"
      emptyMessage="No records found"
    />
  );
}