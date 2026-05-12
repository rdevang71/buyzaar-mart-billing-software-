import CatalogListPage from '@/components/CatalogListPage';

const columns = [
  { key: 'sno', label: 'S. No.', sortable: true },
  { key: 'customer', label: 'Customer', sortable: true },
  { key: 'date', label: 'Date', sortable: true },
  { key: 'description', label: 'Description', sortable: true },
  { key: 'debit', label: 'Debit', sortable: true },
  { key: 'credit', label: 'Credit', sortable: true },
  { key: 'balance', label: 'Balance', sortable: true },
];

export default function CustomerLedgerPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Customer', href: '/customer/dashboard' },
        { label: 'Customer Ledger' },
      ]}
      title="Customer Ledger"
      description="View customer ledger entries"
      createLabel="Create Customer Ledger"
      columns={columns}
      rows={[]}
    />
  );
}