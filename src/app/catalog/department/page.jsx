import CatalogListPage from '@/components/CatalogListPage';

const rows = [
  { id: 1, sno: 1, name: 'Grocery',     manager: 'Ramesh Kumar', sequence: 1 },
  { id: 2, sno: 2, name: 'Electronics', manager: 'Suresh Singh', sequence: 2 },
  { id: 3, sno: 3, name: 'Bakery',      manager: 'Priya Sharma', sequence: 3 },
];

const columns = [
  { key: 'sno',      label: 'S. No.',          sortable: true },
  { key: 'name',     label: 'Department Name', sortable: true },
  { key: 'manager',  label: 'Manager',         sortable: true },
  { key: 'sequence', label: 'Sort Sequence',   sortable: true },
];

export default function DepartmentPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Catalog', href: '/catalog' },
        { label: 'Product Classification', href: '/catalog/category' },
        { label: 'Department' },
      ]}
      title="Department"
      description="Manage departments to organize your store sections."
      createLabel="Create Department"
      columns={columns}
      rows={rows}
    />
  );
}