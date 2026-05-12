import CatalogListPage from '@/components/CatalogListPage';

const columns = [
  { key: 'sno', label: 'S. No.', sortable: true },
  { key: 'credit_note_id', label: 'Credit Note ID', sortable: true },
  { key: 'customer', label: 'Customer', sortable: true },
  { key: 'date', label: 'Date', sortable: true },
  { key: 'amount', label: 'Amount', sortable: true },
  { key: 'reason', label: 'Reason', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
];

export default function CreditNoteHistoryPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Customer', href: '/customer/dashboard' },
        { label: 'Credit Note History' },
      ]}
      title="Credit Note History"
      description="View credit note history"
      createLabel="Create Credit Note History"
      columns={columns}
      rows={[]}
    />
  );
}