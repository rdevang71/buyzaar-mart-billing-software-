"use client";

import MainLayout from '@/components/MainLayout';

export default function ReceiptsPrintPage() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">Receipts (print)</h1>
      <p className="text-sm text-gray-600 mt-2">Global receipt printing and formatting settings.</p>
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
        { label: 'Receipts (Print)' },
      ]}
      title="Receipts (Print)"
      description="Print templates and layout. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="Receipts (Print)(s)"
      emptyMessage="No records found"
    />
  );
}