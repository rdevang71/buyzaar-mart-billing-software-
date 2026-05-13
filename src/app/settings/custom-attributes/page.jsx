'use client';

import CatalogListPage from '@/components/CatalogListPage';

export default function Page() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Home', href: '/home' },
        { label: 'Settings', href: '/settings' },
        { label: 'Custom Attributes' },
      ]}
      title="Custom Attributes"
      description="Your own fields on products and orders. Need Help?"
      createLabel="Create"
      bulkOperations={true}
      columns={[
        { key: 'sno',  label: 'S. No.', sortable: true },
        { key: 'name', label: 'Name',   sortable: true },
      ]}
      rows={[]}
      totalLabel="Custom Attributes(s)"
      emptyMessage="No records found"
    />
  );
}