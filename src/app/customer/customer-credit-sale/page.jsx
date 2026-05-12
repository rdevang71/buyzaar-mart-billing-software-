import CatalogListPage from '@/components/CatalogListPage';

const columns = [
  { key: 'sno', label: 'S. No.', sortable: true },
  { key: 'customer', label: 'Customer', sortable: true },
  { key: 'invoice_id', label: 'Invoice ID', sortable: true },
  { key: 'date', label: 'Date', sortable: true },
  { key: 'amount', label: 'Amount', sortable: true },
  { key: 'paid', label: 'Paid', sortable: true },
  { key: 'due', label: 'Due', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
];

export default function CustomerCreditSalePage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Customer', href: '/customer/dashboard' },
        { label: 'Customer Credit Sale' },
      ]}
      title="Customer Credit Sale"
      description="Manage credit sales"
      createLabel="Create Customer Credit Sale"
      columns={columns}
      rows={[]}
    />
  );
}