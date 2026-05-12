import CatalogListPage from '@/components/CatalogListPage';

const rows = [
  { id: 1, sno: 1, name: 'AMUL',    code: 'AMU001', country: 'India' },
  { id: 2, sno: 2, name: 'Nestlé',  code: 'NES001', country: 'Switzerland' },
  { id: 3, sno: 3, name: 'Britannia', code: 'BRI001', country: 'India' },
];

const columns = [
  { key: 'sno',     label: 'S. No.',             sortable: true },
  { key: 'name',    label: 'Manufacturer Name',  sortable: true },
  { key: 'code',    label: 'Code',               sortable: true },
  { key: 'country', label: 'Country',            sortable: true },
];

export default function ManufacturerPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Catalog', href: '/catalog' },
        { label: 'Product Classification', href: '/catalog/category' },
        { label: 'Manufacturer' },
      ]}
      title="Manufacturer"
      description="Manage all product manufacturers and their details."
      createLabel="Create Manufacturer"
      columns={columns}
      rows={rows}
    />
  );
}