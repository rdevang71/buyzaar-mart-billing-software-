
import CatalogListPage from '@/components/CatalogListPage';

const pgRows = [
  { id: 1, sno: 1, name: 'Dairy Products',  category: 'FMCG-FOOD', count: 5 },
  { id: 2, sno: 2, name: 'Grain & Pulses',  category: 'FMCG-FOOD', count: 3 },
];
const pgColumns = [
  { key: 'sno',      label: 'S. No.',         sortable: true },
  { key: 'name',     label: 'Group Name',     sortable: true },
  { key: 'category', label: 'Category',       sortable: true },
  { key: 'count',    label: 'Products Count', sortable: true },
];

export default function ProductGroupsPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Catalog', href: '/catalog' },
        { label: 'Product', href: '/catalog/products' },
        { label: 'Product Groups' },
      ]}
      title="Product Groups"
      description="Group similar products together for easier management."
      createLabel="Create Product Group"
      columns={pgColumns}
      rows={pgRows}
    />
  );
}