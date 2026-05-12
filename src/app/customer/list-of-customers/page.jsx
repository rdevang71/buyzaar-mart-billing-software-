import CatalogListPage from '@/components/CatalogListPage';

const columns = [
  { key: 'sno', label: 'S. No.', sortable: true },
  { key: 'name', label: 'Customer Name', sortable: true },
  { key: 'phone', label: 'Phone', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'group', label: 'Group', sortable: true },
  { key: 'total_sales', label: 'Total Sales', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
];

export default function ListOfCustomersPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Customer', href: '/customer/dashboard' },
        { label: 'List Of Customers' },
      ]}
      title="List Of Customers"
      description="Manage all your customers"
      createLabel="Create List Of Customers"
      columns={columns}
      rows={[]}
    />
  );
}