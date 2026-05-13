'use client';

import CatalogListPage from '@/components/CatalogListPage';

export default function Page() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Home', href: '/home' },
        { label: 'Settings', href: '/settings' },
        { label: 'Warehouses' },
      ]}
      title="Warehouses"
      description="Central warehouses and storage rules. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="Warehouses(s)"
      emptyMessage="No records found"
    />
  );
}