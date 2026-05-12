import CatalogListPage from '@/components/CatalogListPage';

const rows = [
  { id: 1, sno: 1, name: 'Home Services',  group: 'Repair Services',   sequence: 1 },
  { id: 2, sno: 2, name: 'Salon Services', group: 'Cleaning Services', sequence: 2 },
];

const columns = [
  { key: 'sno',      label: 'S. No.',                sortable: true },
  { key: 'name',     label: 'Service Department',    sortable: true },
  { key: 'group',    label: 'Service Group',         sortable: true },
  { key: 'sequence', label: 'Sort Sequence',         sortable: true },
];

export default function ServiceDepartmentPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Catalog', href: '/catalog' },
        { label: 'Product Classification', href: '/catalog/category' },
        { label: 'Service Department' },
      ]}
      title="Service Department"
      description="Manage service departments under your service groups."
      createLabel="Create Service Department"
      columns={columns}
      rows={rows}
    />
  );
}