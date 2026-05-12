import CatalogListPage from '@/components/CatalogListPage';

const rows = [
  { id: 1, sno: 1, name: 'Sales Revenue',    type: 'INCOME', sequence: 1 },
  { id: 2, sno: 2, name: 'Service Revenue',  type: 'INCOME', sequence: 2 },
  { id: 3, sno: 3, name: 'Other Income',     type: 'INCOME', sequence: 3 },
];

const columns = [
  { key: 'sno',      label: 'S. No.',         sortable: true },
  { key: 'name',     label: 'Income Head',    sortable: true },
  { key: 'type',     label: 'Type',           sortable: true },
  { key: 'sequence', label: 'Sort Sequence',  sortable: true },
];

export default function IncomeHeadPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Catalog', href: '/catalog' },
        { label: 'Product Classification', href: '/catalog/category' },
        { label: 'Income Head' },
      ]}
      title="Income Head"
      description="Define income heads for your billing and accounting."
      createLabel="Create Income Head"
      columns={columns}
      rows={rows}
    />
  );
}