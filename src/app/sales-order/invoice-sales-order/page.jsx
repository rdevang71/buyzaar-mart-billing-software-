import SalesOrderSectionPage from '@/components/SalesOrderSectionPage';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'sales_order_id', label: 'Sales Order ID' },
  { key: 'booking_id', label: 'Booking ID' },
  { key: 'booking_date', label: 'Booking Date' },
  { key: 'billing_username', label: 'Billing Username' },
  { key: 'gross_bill', label: 'Gross Bill' },
  { key: 'total_discount', label: 'Total Discount' },
  { key: 'invoice_id', label: 'Invoice ID' },
  { key: 'invoice_date', label: 'Invoice Date' },
  { key: 'status', label: 'Status' },
  { key: 'channel', label: 'Channel' },
];

export default function InvoiceSalesOrderPage() {
  return (
    <SalesOrderSectionPage
      view="invoice-sales-order"
      breadcrumbs={[
        { label: 'Sales Order', href: '/sales-order' },
        { label: 'Invoice Sales Order' },
      ]}
      title="Invoice Sales Order"
      description="List of Invoice Sales Order"
      columns={columns}
      bulkOperations={['Create Invoice', 'Write Off', 'Export']}
    />
  );
}