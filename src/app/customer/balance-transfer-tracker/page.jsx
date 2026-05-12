import CatalogListPage from '@/components/CatalogListPage';

const columns = [
  { key: 'sno', label: 'S. No.', sortable: true },
  { key: 'from_customer', label: 'From Customer', sortable: true },
  { key: 'to_customer', label: 'To Customer', sortable: true },
  { key: 'date', label: 'Date', sortable: true },
  { key: 'amount', label: 'Amount', sortable: true },
  { key: 'reference', label: 'Reference', sortable: true },
];

export default function BalanceTransferTrackerPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Customer', href: '/customer/dashboard' },
        { label: 'Balance Transfer Tracker' },
      ]}
      title="Balance Transfer Tracker"
      description="Track balance transfers"
      createLabel="Create Balance Transfer Tracker"
      columns={columns}
      rows={[]}
    />
  );
}