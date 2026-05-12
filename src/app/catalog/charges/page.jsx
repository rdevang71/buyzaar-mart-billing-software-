import CatalogListPage from '@/components/CatalogListPage';

const rows = [
  { id: 1, sno: 1, name: 'Packaging Charge', amount: '₹10', applies: 'All Products', type: 'Fixed' },
  { id: 2, sno: 2, name: 'Delivery Charge',  amount: '₹50', applies: 'eStore Orders', type: 'Fixed' },
];

const columns = [
  { key: 'sno',     label: 'S. No.',       sortable: true },
  { key: 'name',    label: 'Charge Name',  sortable: true },
  { key: 'amount',  label: 'Amount',       sortable: true },
  { key: 'applies', label: 'Applies To',   sortable: true },
  { key: 'type',    label: 'Type',         sortable: true },
];

export default function ChargesPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Catalog', href: '/catalog' },
        { label: 'Taxes & Charges', href: '/catalog/taxes' },
        { label: 'Charges' },
      ]}
      title="Charges"
      description="Set up additional charges applied during billing."
      createLabel="Create Charge"
      columns={columns}
      rows={rows}
    />
  );
}