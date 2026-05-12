'use client';

import { useState } from 'react';
import SalesOrderListPage from '@/components/SalesOrderListPage';

const columns = [
  { key: 'id',                label: 'ID' },
  { key: 'sales_order_id',    label: 'Sales Order ID' },
  { key: 'booking_id',        label: 'Booking ID' },
  { key: 'booking_date',      label: 'Booking Date' },
  { key: 'billing_username',  label: 'Billing Username' },
  { key: 'gross_bill',        label: 'Gross Bill' },
  { key: 'write_off_amount',  label: 'Write Off Amount' },
  { key: 'write_off_reason',  label: 'Write Off Reason' },
  { key: 'written_off_by',    label: 'Written Off By' },
  { key: 'written_off_date',  label: 'Written Off Date' },
  { key: 'status',            label: 'Status' },
  { key: 'channel',           label: 'Channel' },
];

export default function WriteOffPage() {
  const [rows, setRows] = useState([]);

  const handleFetch = ({ dateRange, stores }) => {
    // TODO: API call with dateRange and stores
    setRows([]);
  };

  return (
    <SalesOrderListPage
      breadcrumbs={[
        { label: 'Sales Order', href: '/sales-order' },
        { label: 'Write Off' },
      ]}
      title="Write Off"
      description="List of Write Off"
      columns={columns}
      rows={rows}
      onFetch={handleFetch}
      totalLabel="Results"
      emptyMessage="No matching record found"
    />
  );
}