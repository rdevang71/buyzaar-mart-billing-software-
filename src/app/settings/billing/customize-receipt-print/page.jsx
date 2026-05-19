"use client";

import MainLayout from '@/components/MainLayout';

export default function CustomizeReceiptPrintPage() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">Customize Receipt Print</h1>
      <p className="text-sm text-gray-600 mt-2">Configure receipt templates and print settings.</p>
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
        { label: 'Customize Receipt Print' },
      ]}
      title="Customize Receipt Print"
      description="Customize receipt print templates. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="Customize Receipt Print(s)"
      emptyMessage="No records found"
    />
  );
}