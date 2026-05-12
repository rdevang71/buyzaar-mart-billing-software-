import InventoryShell from '@/components/inventory/InventoryShell';

const tableHeaders = [
  'Fulfillment Center',
  'Destination',
  'Requisition ID',
  'Requisition Time',
  'Total Item Number',
  'User',
  'Mail To',
  'Remarks',
  'Status',
  'Fulfillment Status',
  'Approval Status',
  'Action',
];

const tableData = [
  {
    'Fulfillment Center': 'Central Hub',
    'Destination': 'Main Store',
    'Requisition ID': '#REQ-2024-001',
    'Requisition Time': '12 May 2024 10:30 AM',
    'Total Item Number': 25,
    'User': 'Amit Sharma',
    'Mail To': 'amit@store.com',
    'Remarks': 'Urgent stock needed',
    'Status': 'Pending',
    'Fulfillment Status': 'Processing',
    'Approval Status': 'Approved',
    'Action': 'View',
  },
  {
    'Fulfillment Center': 'Central Hub',
    'Destination': 'Outlet 1',
    'Requisition ID': '#REQ-2024-002',
    'Requisition Time': '11 May 2024 02:15 PM',
    'Total Item Number': 18,
    'User': 'Priya Verma',
    'Mail To': 'priya@outlet1.com',
    'Remarks': 'Regular replenishment',
    'Status': 'Fulfilled',
    'Fulfillment Status': 'Completed',
    'Approval Status': 'Approved',
    'Action': 'View',
  },
  {
    'Fulfillment Center': 'Central Hub',
    'Destination': 'Outlet 2',
    'Requisition ID': '#REQ-2024-003',
    'Requisition Time': '10 May 2024 09:45 AM',
    'Total Item Number': 32,
    'User': 'Rajesh Kumar',
    'Mail To': 'rajesh@outlet2.com',
    'Remarks': 'High-demand items',
    'Status': 'Pending',
    'Fulfillment Status': 'Pending',
    'Approval Status': 'Pending',
    'Action': 'View',
  },
  {
    'Fulfillment Center': 'Central Hub',
    'Destination': 'Main Store',
    'Requisition ID': '#REQ-2024-004',
    'Requisition Time': '09 May 2024 11:20 AM',
    'Total Item Number': 20,
    'User': 'Neha Singh',
    'Mail To': 'neha@store.com',
    'Remarks': 'Seasonal stock',
    'Status': 'Fulfilled',
    'Fulfillment Status': 'Completed',
    'Approval Status': 'Approved',
    'Action': 'View',
  },
];

export default function StockRequisitionPage() {
  return (
    <InventoryShell
      breadcrumb={[{ label: 'Inventory' }, { label: 'Stock Requisition' }]}
      title="Stock Requisition"
      subtitle="Stock Requisition transaction history of last 7 days. Need Help?"
      actions={[{ label: 'Requisition (Excel)' }, { label: 'Request Stocks', primary: true }]}
      searchPlaceholder="Search"
      filters={['Date Range', 'Select Source', 'Fulfillment Status']}
      tableHeaders={tableHeaders}
      tableData={tableData}
    />
  );
}