"use client";

import MainLayout from '@/components/MainLayout';

export default function RemarksPage() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">Remarks</h1>
      <p className="text-sm text-gray-600 mt-2">Manage default remarks used across receipts and documents.</p>
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
        { label: 'Remarks' },
      ]}
      title="Remarks"
      description="Void and refund reason list. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="Remarks(s)"
      emptyMessage="No records found"
    />
  );
}