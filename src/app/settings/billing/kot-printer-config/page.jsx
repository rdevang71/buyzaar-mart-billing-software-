"use client";

import MainLayout from '@/components/MainLayout';

export default function KotPrinterConfigPage() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">KOT Printer Config</h1>
      <p className="text-sm text-gray-600 mt-2">Configure kitchen order ticket (KOT) printer settings.</p>
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
        { label: 'KOT Printer Config' },
      ]}
      title="KOT Printer Config"
      description="Configure KOT printer settings. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="KOT Printer Config(s)"
      emptyMessage="No records found"
    />
  );
}