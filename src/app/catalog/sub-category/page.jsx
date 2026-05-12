import CatalogListPage from '@/components/CatalogListPage';

const rows = [
  { id: 1, sno: 1, name: 'Default sub category (none)', category: 'Default category (none)', sequence: null },
];

const columns = [
  { key: 'sno',      label: 'S. No.',             sortable: true },
  { key: 'name',     label: 'Sub Category Name',  sortable: true },
  { key: 'category', label: 'Category Name',      sortable: true },
  { key: 'sequence', label: 'Sort Sequence',      sortable: true },
];

export default function SubCategoryPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Catalog', href: '/catalog' },
        { label: 'Product Classification', href: '/catalog/category' },
        { label: 'Sub Category' },
      ]}
      title="Sub Category"
      description="Organize products under the same category as subcategories."
      createLabel="Create Sub Category"
      columns={columns}
      rows={rows}
      rowAction="View Products"
    />
  );
}