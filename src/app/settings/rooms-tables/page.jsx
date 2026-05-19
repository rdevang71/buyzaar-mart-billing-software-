"use client";

import MainLayout from '@/components/MainLayout';

export default function RoomsTablesPage() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">Rooms & Tables</h1>
      <p className="text-sm text-gray-600 mt-2">Manage room and table definitions for dine-in POS.</p>
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
        { label: 'Rooms & Tables' },
      ]}
      title="Rooms & Tables"
      description="Dine-in floor plan and table assignments. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="Rooms & Tables(s)"
      emptyMessage="No records found"
    />
  );
}