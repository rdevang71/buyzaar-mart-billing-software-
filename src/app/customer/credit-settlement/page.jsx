import CatalogListPage from '@/components/CatalogListPage';

const columns = [
  { key: 'sno', label: 'S. No.', sortable: true },
  { key: 'customer', label: 'Customer', sortable: true },
  { key: 'settlement_date', label: 'Settlement Date', sortable: true },
  { key: 'amount', label: 'Amount', sortable: true },
  { key: 'mode', label: 'Payment Mode', sortable: true },
  { key: 'reference', label: 'Reference', sortable: true },
];

export default function CreditSettlementPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Customer', href: '/customer/dashboard' },
        { label: 'Credit Settlement' },
      ]}
      title="Credit Settlement"
      description="Settle customer credit"
      createLabel="Create Credit Settlement"
      columns={columns}
      rows={[]}
    />
  );
}