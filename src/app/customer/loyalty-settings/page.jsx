import CatalogListPage from '@/components/CatalogListPage';

const columns = [
  { key: 'sno', label: 'S. No.', sortable: true },
  { key: 'setting', label: 'Setting', sortable: true },
  { key: 'value', label: 'Value', sortable: true },
  { key: 'description', label: 'Description', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
];

export default function LoyaltySettingsPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Customer', href: '/customer/dashboard' },
        { label: 'Loyalty Settings' },
      ]}
      title="Loyalty Settings"
      description="Configure loyalty program settings"
      createLabel="Create Loyalty Settings"
      columns={columns}
      rows={[]}
    />
  );
}