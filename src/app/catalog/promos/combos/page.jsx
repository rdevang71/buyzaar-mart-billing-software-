'use client';
import CatalogListPage from '@/components/CatalogListPage';

const comboRows = [
  { id: 1, sno: 1, name: 'Breakfast Combo', items: '3 items', price: '₹199', status: 'Active' },
  { id: 2, sno: 2, name: 'Dal-Rice Combo',  items: '2 items', price: '₹149', status: 'Active' },
];
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
    <CatalogListPage
      breadcrumbs={[{ label:'Catalog',href:'/catalog'},{ label:'Promotional Products',href:'/catalog/promos/combos'},{ label:'Combos'}]}
      title="Combos" description="Create product combos to boost sales."
      createLabel="Create Combo" columns={comboColumns} rows={comboRows}
    />
  );
}