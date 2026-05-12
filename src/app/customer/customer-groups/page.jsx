import CatalogListPage from '@/components/CatalogListPage';

const columns = [
  { key: 'sno', label: 'S. No.', sortable: true },
  { key: 'name', label: 'Group Name', sortable: true },
  { key: 'description', label: 'Description', sortable: true },
  { key: 'customers', label: 'Total Customers', sortable: true },
];

export default function CustomerGroupsPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Customer', href: '/customer/dashboard' },
        { label: 'Customer Groups' },
      ]}
      title="Customer Groups"
      description="Manage customer groups"
      createLabel="Create Customer Groups"
      columns={columns}
      rows={[]}
    />
  );
}