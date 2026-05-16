'use client';

import CatalogDataPage from '@/components/CatalogDataPage';

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
    <CatalogDataPage
      endpoint="/api/catalog/products"
      breadcrumbs={[
        { label: 'Catalog', href: '/catalog' },
        { label: 'Product', href: '/catalog/products' },
        { label: 'Products' },
      ]}
      title="Products"
      description="Manage all products in your catalog."
      columns={columns}
      totalLabel="Product(s)"
      emptyMessage="No products found"
      mapRecord={(record, index, page, pageSize) => ({
        id: record.id,
        sno: (page - 1) * pageSize + index + 1,
        name: record.name,
        category: record.category_name || '—',
        brand: record.brand_name || '—',
        price: `₹${record.selling_price ?? record.mrp ?? 0}`,
        stock: record.available_stock ?? '—',
      })}
    />
  );
}