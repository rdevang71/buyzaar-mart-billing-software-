import CatalogListPage from '@/components/CatalogListPage';

const columns = [
  { key: 'sno', label: 'S. No.', sortable: true },
  { key: 'customer', label: 'Customer', sortable: true },
  { key: 'date', label: 'Date', sortable: true },
  { key: 'amount', label: 'Amount', sortable: true },
  { key: 'mode', label: 'Payment Mode', sortable: true },
  { key: 'used', label: 'Used', sortable: true },
  { key: 'balance', label: 'Balance', sortable: true },
];

export default function CustomerAdvancePaymentPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Customer', href: '/customer/dashboard' },
        { label: 'Customer Advance Payment' },
      ]}
      title="Customer Advance Payment"
      description="Track advance payments"
      createLabel="Create Customer Advance Payment"
      columns={columns}
      rows={[]}
    />
  );
}