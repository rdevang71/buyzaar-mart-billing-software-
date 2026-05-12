import CatalogListPage from '@/components/CatalogListPage';

const columns = [
  { key: 'sno', label: 'S. No.', sortable: true },
  { key: 'config_name', label: 'Config Name', sortable: true },
  { key: 'value', label: 'Value', sortable: true },
  { key: 'description', label: 'Description', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
];

export default function CreditAdvancedConfigsListPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Customer', href: '/customer/dashboard' },
        { label: 'Credit Advanced Configs List' },
      ]}
      title="Credit Advanced Configs List"
      description="Advanced credit configurations"
      createLabel="Create Credit Advanced Configs List"
      columns={columns}
      rows={[]}
    />
  );
}