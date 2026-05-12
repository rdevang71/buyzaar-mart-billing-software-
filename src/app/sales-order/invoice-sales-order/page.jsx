'use client';
import CatalogListPage from '@/components/CatalogListPage';

const rows = [
  { id: 1, sno: 1, name: 'Default category (none)', type: 'OTHER', sequence: null },
  { id: 2, sno: 2, name: 'FMCG-FOOD',               type: 'OTHER', sequence: 0 },
  { id: 3, sno: 3, name: 'Chocolates',               type: 'OTHER', sequence: 0 },
];

const columns = [
  { key: 'sno',      label: 'S. No.',        sortable: true },
  { key: 'name',     label: 'Category Name', sortable: true },
  { key: 'type',     label: 'Category Type', sortable: true },
  { key: 'sequence', label: 'Sort Sequence', sortable: true },
];

export default function CategoryPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Catalog', href: '/catalog' },
        { label: 'Product Classification', href: '/catalog/category' },
        { label: 'Category' },
      ]}
      title="Category"
      description="Categorize all your products according to your choice"
      createLabel="Create Category"
      columns={columns}
      rows={rows}
      rowAction="View Products"
    />
  );
}