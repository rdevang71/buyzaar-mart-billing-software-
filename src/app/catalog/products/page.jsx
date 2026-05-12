import CatalogListPage from '@/components/CatalogListPage';

const rows = [
  { id: 1, sno: 1, name: 'AMUL COW GHEE 1 LTR', category: 'FMCG-FOOD', brand: 'AMUL',    price: '₹645', stock: '-' },
  { id: 2, sno: 2, name: 'AMUL GHEE 1 LTR RT',  category: 'FMCG-FOOD', brand: 'AMUL',    price: '₹610', stock: '-' },
  { id: 3, sno: 3, name: 'BABUJI CHANA 200GM',   category: 'FMCG-FOOD', brand: 'Babu Ji', price: '₹80',  stock: '-' },
  { id: 4, sno: 4, name: 'DIET MIX 300GM',       category: 'FMCG-FOOD', brand: 'Babu Ji', price: '₹129', stock: '-' },
  { id: 5, sno: 5, name: 'FORTUNE RICE BRAN OIL',category: 'FMCG-FOOD', brand: 'Fortune', price: '₹180', stock: '24' },
];

const columns = [
  { key: 'sno',      label: 'S. No.',        sortable: true },
  { key: 'name',     label: 'Product Name',  sortable: true },
  { key: 'category', label: 'Category',      sortable: true },
  { key: 'brand',    label: 'Brand',         sortable: true },
  { key: 'price',    label: 'Price',         sortable: true },
  { key: 'stock',    label: 'Stock',         sortable: true },
];

export default function ProductsPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Catalog', href: '/catalog' },
        { label: 'Product', href: '/catalog/products' },
        { label: 'Products' },
      ]}
      title="Products"
      description="Manage all products in your catalog."
      createLabel="Create Product"
      columns={columns}
      rows={rows}
    />
  );
}