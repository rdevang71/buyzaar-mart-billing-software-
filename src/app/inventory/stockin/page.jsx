import InventoryShell from '@/components/inventory/InventoryShell';

const tableHeaders = [
  'Transaction ID',
  'Invoice Number',
  'Destination',
  'Invoice Date',
  'Total Item Number',
  'Cost',
  'Reference Transaction Type',
  'Reference ID',
];

const tableData = [
  {
    'Transaction ID': '#STK-001',
    'Invoice Number': 'INV-2024-001',
    'Destination': 'Main Store',
    'Invoice Date': '12 May 2024',
    'Total Item Number': 45,
    'Cost': '₹12,450',
    'Reference Transaction Type': 'Purchase',
    'Reference ID': 'PO-2024-001',
  },
  {
    'Transaction ID': '#STK-002',
    'Invoice Number': 'INV-2024-002',
    'Destination': 'Outlet 2',
    'Invoice Date': '11 May 2024',
    'Total Item Number': 32,
    'Cost': '₹8,920',
    'Reference Transaction Type': 'Transfer',
    'Reference ID': 'TRN-2024-001',
  },
  {
    'Transaction ID': '#STK-003',
    'Invoice Number': 'INV-2024-003',
    'Destination': 'Main Store',
    'Invoice Date': '10 May 2024',
    'Total Item Number': 58,
    'Cost': '₹16,800',
    'Reference Transaction Type': 'Purchase',
    'Reference ID': 'PO-2024-002',
  },
  {
    'Transaction ID': '#STK-004',
    'Invoice Number': 'INV-2024-004',
    'Destination': 'Outlet 1',
    'Invoice Date': '09 May 2024',
    'Total Item Number': 27,
    'Cost': '₹7,650',
    'Reference Transaction Type': 'Requisition',
    'Reference ID': 'REQ-2024-001',
  },
  {
    'Transaction ID': '#STK-005',
    'Invoice Number': 'INV-2024-005',
    'Destination': 'Main Store',
    'Invoice Date': '08 May 2024',
    'Total Item Number': 41,
    'Cost': '₹11,300',
    'Reference Transaction Type': 'Purchase',
    'Reference ID': 'PO-2024-003',
  },
];

export default function StockInPage() {
  return (
    <InventoryShell
      breadcrumb={[{ label: 'Inventory' }, { label: 'Stock In' }]}
      title="Stock In"
      subtitle="Stock In transaction history of last 7 days. Need Help?"
      actions={[{ label: 'Add In Bulk (Excel)' }, { label: 'Add Stock', primary: true }]}
      searchPlaceholder="Search"
      filters={['Date Range', 'Select Source']}
      tableHeaders={tableHeaders}
      tableData={tableData}
    />
  );
}