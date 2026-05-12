import SalesOrderListPage from '@/components/SalesOrderListPage';

const columns = [
  { key: 'id',               label: 'ID' },
  { key: 'quotation_id',     label: 'Quotation ID' },
  { key: 'booking_id',       label: 'Booking ID' },
  { key: 'booking_date',     label: 'Booking Date' },
  { key: 'billing_username', label: 'Billing Username' },
  { key: 'gross_bill',       label: 'Gross Bill' },
  { key: 'total_discount',   label: 'Total Discount' },
  { key: 'created_by',       label: 'Created By' },
  { key: 'submitted_date',   label: 'Submitted Date' },
  { key: 'approver',         label: 'Approver' },
  { key: 'status',           label: 'Status' },
  { key: 'channel',          label: 'Channel' },
];

export default function QuotationPendingApprovalPage() {
  return (
    <SalesOrderListPage
      breadcrumbs={[
        { label: 'Sales Order', href: '/sales-order' },
        { label: 'Quotation Pending Approval' },
      ]}
      title="Quotation Pending Approval"
      description="List of Quotation Pending Approval"
      columns={columns}
      rows={[]}
    />
  );
}