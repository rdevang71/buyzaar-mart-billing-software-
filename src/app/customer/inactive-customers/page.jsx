import CatalogListPage from '@/components/CatalogListPage';

const columns = [
  { key: 'sno', label: 'S. No.', sortable: true },
  { key: 'name', label: 'Customer Name', sortable: true },
  { key: 'phone', label: 'Phone', sortable: true },
  { key: 'last_visit', label: 'Last Visit', sortable: true },
  { key: 'total_sales', label: 'Total Sales', sortable: true },
];

export default function InactiveCustomersPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Customer', href: '/customer/dashboard' },
        { label: 'Inactive Customers' },
      ]}
      title="Inactive Customers"
      description="List of inactive customers"
      createLabel="Create Inactive Customers"
      columns={columns}
      rows={[]}
    />
  );
}