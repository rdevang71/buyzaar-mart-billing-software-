'use client';
import CatalogDataPage from '@/components/CatalogDataPage';
const comboColumns = [
  { key: 'sno',    label: 'S. No.',      sortable: true },
  { key: 'name',   label: 'Combo Name',  sortable: true },
  { key: 'items',  label: 'Items',       sortable: true },
  { key: 'price',  label: 'Price',       sortable: true },
  { key: 'status', label: 'Status',      sortable: true,
    render: (v) => <span className={`text-[11.5px] font-semibold px-2 py-0.5 rounded-full ${v==='Active'?'bg-green-50 text-green-600':'bg-red-50 text-red-500'}`}>{v}</span>
  },
];

export default function CombosPage() {
  return (
    <CatalogDataPage
      endpoint="/api/catalog/combos"
      breadcrumbs={[{ label:'Catalog',href:'/catalog'},{ label:'Promotional Products',href:'/catalog/promos/combos'},{ label:'Combos'}]}
      title="Combos" description="Create product combos to boost sales."
      columns={comboColumns}
      totalLabel="Combo(s)"
      emptyMessage="No combos found"
      mapRecord={(record, index, page, pageSize) => ({
        id: record.id,
        sno: (page - 1) * pageSize + index + 1,
        name: record.name,
        items: record.items,
        price: `₹${record.price}`,
        status: record.status,
      })}
    />
  );
}