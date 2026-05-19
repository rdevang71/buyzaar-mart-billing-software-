"use client";

import MainLayout from '@/components/MainLayout';

function BusinessInfoPage() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">Business Info</h1>
      <p className="text-sm text-gray-600 mt-2">Manage company/business profile and registration details.</p>
    </MainLayout>
  );
}

import CatalogListPage from '@/components/CatalogListPage';

export default function Page() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Home', href: '/home' },
        { label: 'Settings', href: '/settings' },
        { label: 'Business Info' },
      ]}
      title="Business Info"
      description="Legal name, GSTIN, logo, contact. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="Business Info(s)"
      emptyMessage="No records found"
    />
  );
}