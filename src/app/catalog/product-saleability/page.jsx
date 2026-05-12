'use client';
import CatalogListPage from '@/components/CatalogListPage';

const rows = [
  { id: 1, sno: 1, product: 'AMUL COW GHEE 1 LTR', store: 'Main Store',  status: 'Active' },
  { id: 2, sno: 2, product: 'FORTUNE RICE BRAN OIL', store: 'Main Store', status: 'Active' },
];

const columns = [
  { key: 'sno',     label: 'S. No.',        sortable: true },
  { key: 'product', label: 'Product Name',  sortable: true },
  { key: 'store',   label: 'Store',         sortable: true },
  { key: 'status',  label: 'Status',        sortable: true,
    render: (v) => (
      <span className={`text-[11.5px] font-semibold px-2 py-0.5 rounded-full
        ${v === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
        {v}
      </span>
    )
  },
];

export default function ProductSaleabilityPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Catalog', href: '/catalog' },
        { label: 'Product', href: '/catalog/products' },
        { label: 'Product Saleability' },
      ]}
      title="Product Saleability"
      description="Control which products are available for sale at each store."
      createLabel="Add Saleability"
      columns={columns}
      rows={rows}
    />
  );
}