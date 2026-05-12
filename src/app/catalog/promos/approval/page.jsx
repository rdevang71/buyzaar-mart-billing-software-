'use client';
import CatalogListPage from '@/components/CatalogListPage';

const rows = [
  { id: 1, sno: 1, promotion: 'Weekend Sale',  requestedBy: 'Manager A', date: '28 May 2025', status: 'Pending' },
  { id: 2, sno: 2, promotion: 'Diwali Offer',  requestedBy: 'Manager B', date: '15 May 2025', status: 'Approved' },
];
const columns = [
  { key: 'sno',         label: 'S. No.',         sortable: true },
  { key: 'promotion',   label: 'Promotion',      sortable: true },
  { key: 'requestedBy', label: 'Requested By',   sortable: true },
  { key: 'date',        label: 'Date',           sortable: true },
  { key: 'status',      label: 'Status',         sortable: true,
    render: (v) => (
      <span className={`text-[11.5px] font-semibold px-2 py-0.5 rounded-full
        ${v==='Approved'?'bg-green-50 text-green-600':v==='Pending'?'bg-yellow-50 text-yellow-600':'bg-red-50 text-red-500'}`}>
        {v}
      </span>
    )
  },
];

export default function PromotionApprovalPage() {
  return (
    <CatalogListPage
      breadcrumbs={[{ label:'Catalog',href:'/catalog'},{ label:'Promotional Products'},{ label:'Promotion Approval'}]}
      title="Promotion Approval" description="Review and approve promotion requests from your team."
      createLabel="Request Approval" columns={columns} rows={rows}
    />
  );
}