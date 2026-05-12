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
    'Transaction ID': '#STKO-001',
    'Invoice Number': 'INV-2024-101',
    'Destination': 'Main Store',
    'Invoice Date': '12 May 2024',
    'Total Item Number': 18,
    'Cost': '₹5,200',
    'Reference Transaction Type': 'Sales',
    'Reference ID': 'ORD-2024-401',
  },
  {
    'Transaction ID': '#STKO-002',
    'Invoice Number': 'INV-2024-102',
    'Destination': 'Outlet 2',
    'Invoice Date': '11 May 2024',
    'Total Item Number': 12,
    'Cost': '₹3,450',
    'Reference Transaction Type': 'Damage',
    'Reference ID': 'DAM-2024-001',
  },
  {
    'Transaction ID': '#STKO-003',
    'Invoice Number': 'INV-2024-103',
    'Destination': 'Main Store',
    'Invoice Date': '10 May 2024',
    'Total Item Number': 24,
    'Cost': '₹6,900',
    'Reference Transaction Type': 'Sales',
    'Reference ID': 'ORD-2024-402',
  },
  {
    'Transaction ID': '#STKO-004',
    'Invoice Number': 'INV-2024-104',
    'Destination': 'Outlet 1',
    'Invoice Date': '09 May 2024',
    'Total Item Number': 15,
    'Cost': '₹4,200',
    'Reference Transaction Type': 'Expired',
    'Reference ID': 'EXP-2024-001',
  },
];

export default function StockOutPage() {
  return (
    <InventoryShell
      breadcrumb={[{ label: 'Inventory' }, { label: 'Stock Out' }]}
      title="Stock Out"
      subtitle="Stock Out transaction history of last 7 days. Need Help?"
      actions={[{ label: 'Remove In Bulk (Excel)' }, { label: 'Remove Stock', primary: true }]}
      searchPlaceholder="Search"
      filters={['Date Range', 'Select Source']}
      tableHeaders={tableHeaders}
      tableData={tableData}
    />
  );
}