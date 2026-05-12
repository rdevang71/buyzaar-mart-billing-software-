import CatalogListPage from '@/components/CatalogListPage';

const columns = [
  { key: 'sno', label: 'S. No.', sortable: true },
  { key: 'date', label: 'Date', sortable: true },
  { key: 'credits_added', label: 'Credits Added', sortable: true },
  { key: 'credits_used', label: 'Credits Used', sortable: true },
  { key: 'balance', label: 'Balance', sortable: true },
  { key: 'remarks', label: 'Remarks', sortable: true },
];

export default function SmsCreditPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Customer', href: '/customer/dashboard' },
        { label: 'SMS Credit' },
      ]}
      title="SMS Credit"
      description="Manage SMS credits"
      createLabel="Create SMS Credit"
      columns={columns}
      rows={[]}
    />
  );
}