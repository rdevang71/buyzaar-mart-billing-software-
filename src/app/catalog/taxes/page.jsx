import CatalogListPage from '@/components/CatalogListPage';

const rows = [
  { id: 1, sno: 1, name: 'GST 5%',  rate: '5%',  type: 'GST',  hsn: '1905' },
  { id: 2, sno: 2, name: 'GST 12%', rate: '12%', type: 'GST',  hsn: '2106' },
  { id: 3, sno: 3, name: 'GST 18%', rate: '18%', type: 'GST',  hsn: '3304' },
  { id: 4, sno: 4, name: 'GST 28%', rate: '28%', type: 'GST',  hsn: '8471' },
  { id: 5, sno: 5, name: 'Exempt',  rate: '0%',  type: 'NONE', hsn: '-' },
];

const columns = [
  { key: 'sno',  label: 'S. No.',    sortable: true },
  { key: 'name', label: 'Tax Name',  sortable: true },
  { key: 'rate', label: 'Tax Rate',  sortable: true },
  { key: 'type', label: 'Tax Type',  sortable: true },
  { key: 'hsn',  label: 'HSN Code',  sortable: true },
];

export default function TaxesPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Catalog', href: '/catalog' },
        { label: 'Taxes & Charges', href: '/catalog/taxes' },
        { label: 'Taxes' },
      ]}
      title="Taxes"
      description="Manage GST and other tax slabs for your products."
      createLabel="Create Tax"
      columns={columns}
      rows={rows}
    />
  );
}