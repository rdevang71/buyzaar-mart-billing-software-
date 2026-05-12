import CatalogListPage from '@/components/CatalogListPage';

const columns = [
  { key: 'sno', label: 'S. No.', sortable: true },
  { key: 'order_id', label: 'Order ID', sortable: true },
  { key: 'customer', label: 'Customer', sortable: true },
  { key: 'date', label: 'Date', sortable: true },
  { key: 'amount', label: 'Amount', sortable: true },
  { key: 'due', label: 'Due Amount', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
];

export default function UnsettledOrdersPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Customer', href: '/customer/dashboard' },
        { label: 'Unsettled Orders' },
      ]}
      title="Unsettled Orders"
      description="List of unsettled customer orders"
      createLabel="Create Unsettled Orders"
      columns={columns}
      rows={[]}
    />
  );
}