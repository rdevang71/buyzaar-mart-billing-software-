import CatalogListPage from '@/components/CatalogListPage';

const rows = [
  { id: 1, sno: 1, name: 'AMUL',    manufacturer: 'AMUL',    sequence: 1 },
  { id: 2, sno: 2, name: 'Fortune', manufacturer: 'Adani',   sequence: 2 },
  { id: 3, sno: 3, name: 'TATA',    manufacturer: 'TATA',    sequence: 3 },
  { id: 4, sno: 4, name: 'Babu Ji', manufacturer: 'Babu Ji', sequence: 4 },
];

const columns = [
  { key: 'sno',          label: 'S. No.',       sortable: true },
  { key: 'name',         label: 'Brand Name',   sortable: true },
  { key: 'manufacturer', label: 'Manufacturer', sortable: true },
  { key: 'sequence',     label: 'Sort Sequence',sortable: true },
];

export default function BrandPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Catalog', href: '/catalog' },
        { label: 'Product Classification', href: '/catalog/category' },
        { label: 'Brand' },
      ]}
      title="Brand"
      description="Manage all brands associated with your products."
      createLabel="Create Brand"
      columns={columns}
      rows={rows}
      rowAction="View Products"
    />
  );
}