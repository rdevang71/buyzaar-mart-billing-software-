'use client';
import CatalogDataPage from '@/components/CatalogDataPage';

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
    <CatalogDataPage
      endpoint="/api/catalog/product-saleability"
      breadcrumbs={[
        { label: 'Catalog', href: '/catalog' },
        { label: 'Product', href: '/catalog/products' },
        { label: 'Product Saleability' },
      ]}
      title="Product Saleability"
      description="Control which products are available for sale at each store."
      columns={columns}
      totalLabel="Saleability Record(s)"
      emptyMessage="No saleability records found"
      mapRecord={(record, index, page, pageSize) => ({
        id: record.id,
        sno: (page - 1) * pageSize + index + 1,
        product: record.product || '—',
        store: record.store || '—',
        status: record.is_active ? 'Active' : 'Inactive',
      })}
    />
  );
}