import CatalogListPage from '@/components/CatalogListPage';

const columns = [
  { key: 'sno', label: 'S. No.', sortable: true },
  { key: 'customer', label: 'Customer', sortable: true },
  { key: 'type', label: 'Type', sortable: true },
  { key: 'message', label: 'Message', sortable: true },
  { key: 'sent_at', label: 'Sent At', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
];

export default function MessageHistoryPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Customer', href: '/customer/dashboard' },
        { label: 'Message History' },
      ]}
      title="Message History"
      description="Customer message history"
      createLabel="Create Message History"
      columns={columns}
      rows={[]}
    />
  );
}