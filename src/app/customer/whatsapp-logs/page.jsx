import CatalogListPage from '@/components/CatalogListPage';

const columns = [
  { key: 'sno', label: 'S. No.', sortable: true },
  { key: 'customer', label: 'Customer', sortable: true },
  { key: 'phone', label: 'Phone', sortable: true },
  { key: 'message', label: 'Message', sortable: true },
  { key: 'sent_at', label: 'Sent At', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
];

export default function WhatsappLogsPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Customer', href: '/customer/dashboard' },
        { label: 'WhatsApp Logs' },
      ]}
      title="WhatsApp Logs"
      description="WhatsApp message logs"
      createLabel="Create WhatsApp Logs"
      columns={columns}
      rows={[]}
    />
  );
}