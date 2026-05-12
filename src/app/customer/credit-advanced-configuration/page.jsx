import CatalogListPage from '@/components/CatalogListPage';

const columns = [
  { key: 'sno', label: 'S. No.', sortable: true },
  { key: 'parameter', label: 'Parameter', sortable: true },
  { key: 'value', label: 'Value', sortable: true },
  { key: 'type', label: 'Type', sortable: true },
  { key: 'updated_at', label: 'Updated At', sortable: true },
];

export default function CreditAdvancedConfigurationPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Customer', href: '/customer/dashboard' },
        { label: 'Credit Advanced Configuration' },
      ]}
      title="Credit Advanced Configuration"
      description="Configure advanced credit settings"
      createLabel="Create Credit Advanced Configuration"
      columns={columns}
      rows={[]}
    />
  );
}