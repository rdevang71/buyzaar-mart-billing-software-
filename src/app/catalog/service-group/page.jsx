import CatalogListPage from '@/components/CatalogListPage';

const rows = [
  { id: 1, sno: 1, name: 'Repair Services',   code: 'REP', sequence: 1 },
  { id: 2, sno: 2, name: 'Cleaning Services', code: 'CLN', sequence: 2 },
];

const columns = [
  { key: 'sno',      label: 'S. No.',          sortable: true },
  { key: 'name',     label: 'Service Group',   sortable: true },
  { key: 'code',     label: 'Code',            sortable: true },
  { key: 'sequence', label: 'Sort Sequence',   sortable: true },
];

export default function ServiceGroupPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Catalog', href: '/catalog' },
        { label: 'Product Classification', href: '/catalog/category' },
        { label: 'Service Group' },
      ]}
      title="Service Group"
      description="Group your services for better catalog management."
      createLabel="Create Service Group"
      columns={columns}
      rows={rows}
    />
  );
}