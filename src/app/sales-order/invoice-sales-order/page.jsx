'use client';

import SalesOrderListPage from '@/components/SalesOrderListPage';

const columns = [
  { key: 'id',           label: 'ID' },
  { key: 'billNumber',   label: 'Bill Number' },
  { key: 'customerName', label: 'Customer' },
  { key: 'billingUser',  label: 'Billing User' },
  { key: 'grandTotal',   label: 'Amount' },
  { key: 'paymentMode',  label: 'Mode' },
  { key: 'status',       label: 'Status' },
  { key: 'createdAt',    label: 'Date' },
];

export default function InvoiceSalesOrderPage() {
  return (
    <SalesOrderListPage
      breadcrumbs={[
        { label: 'Sales Order', href: '/sales-order' },
        { label: 'Invoice Sales Order' },
      ]}
      title="Invoice Sales Order"
      description="List of invoice sales orders"
      columns={columns}
      rows={[]}
    />
  );
}