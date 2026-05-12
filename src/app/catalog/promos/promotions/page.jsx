'use client';
import CatalogListPage from '@/components/CatalogListPage';

const rows = [
  { id: 1, sno: 1, name: 'Weekend Sale',  type: 'Discount', discount: '15%', start: '01 Jun 2025', end: '30 Jun 2025', status: 'Active' },
  { id: 2, sno: 2, name: 'Diwali Offer',  type: 'Flat Off', discount: '₹200', start: '01 Oct 2025', end: '31 Oct 2025', status: 'Inactive' },
];
const columns = [
  { key: 'sno',      label: 'S. No.',         sortable: true },
  { key: 'name',     label: 'Promotion Name', sortable: true },
  { key: 'type',     label: 'Type',           sortable: true },
  { key: 'discount', label: 'Discount',       sortable: true },
  { key: 'start',    label: 'Start Date',     sortable: true },
  { key: 'end',      label: 'End Date',       sortable: true },
  { key: 'status',   label: 'Status',         sortable: true,
    render: (v) => <span className={`text-[11.5px] font-semibold px-2 py-0.5 rounded-full ${v==='Active'?'bg-green-50 text-green-600':'bg-gray-100 text-gray-500'}`}>{v}</span>
  },
];

export default function PromotionsPage() {
  return (
    <CatalogListPage
      breadcrumbs={[{ label:'Catalog',href:'/catalog'},{ label:'Promotional Products'},{ label:'Promotions'}]}
      title="Promotions" description="Create promotional campaigns to drive more sales."
      createLabel="Create Promotion" columns={columns} rows={rows}
    />
  );
}