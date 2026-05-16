'use client';
import CatalogDataPage from '@/components/CatalogDataPage';
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
    <CatalogDataPage
      endpoint="/api/catalog/promotion-approvals"
      breadcrumbs={[{ label:'Catalog',href:'/catalog'},{ label:'Promotional Products'},{ label:'Promotion Approval'}]}
      title="Promotion Approval" description="Review and approve promotion requests from your team."
      columns={columns}
      totalLabel="Approval(s)"
      emptyMessage="No approval requests found"
      mapRecord={(record, index, page, pageSize) => ({
        id: record.id,
        sno: (page - 1) * pageSize + index + 1,
        promotion: record.promotion,
        requestedBy: record.requested_by,
        date: record.request_date,
        status: record.status,
      })}
    />
  );
}