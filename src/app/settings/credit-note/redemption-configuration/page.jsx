"use client";

import MainLayout from '@/components/MainLayout';

export default function RedemptionConfigurationPage() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold">Redemption Configuration</h1>
      <p className="text-sm text-gray-600 mt-2">Configure redemption rules for credit notes and vouchers.</p>
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
        { label: 'Credit Note Configuration' },
        { label: 'Redemption Configuration' },
      ]}
      title="Redemption Configuration"
      description="Configure credit note redemption rules. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="Redemption Configuration(s)"
      emptyMessage="No records found"
    />
  );
}