"use client";

import MainLayout from '@/components/MainLayout';

export default function KotPrintersPage() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">KOT Printers</h1>
      <p className="text-sm text-gray-600 mt-2">Manage kitchen order ticket printers and mappings.</p>
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
        { label: 'KOT Printers' },
      ]}
      title="KOT Printers"
      description="Kitchen printer routing and format. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="KOT Printers(s)"
      emptyMessage="No records found"
    />
  );
}