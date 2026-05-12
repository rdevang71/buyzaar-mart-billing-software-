import InventoryShell from '@/components/inventory/InventoryShell';

const tableHeaders = [
  'Transaction ID',
  'Invoice Number',
  'Source Name',
  'Destination Name',
  'Invoice Date',
  'Total Item Number',
  'Cost',
];

const tableData = [
  {
    'Transaction ID': '#TRN-001',
    'Invoice Number': 'INV-2024-201',
    'Source Name': 'Main Store',
    'Destination Name': 'Outlet 1',
    'Invoice Date': '12 May 2024',
    'Total Item Number': 35,
    'Cost': '₹9,800',
  },
  {
    'Transaction ID': '#TRN-002',
    'Invoice Number': 'INV-2024-202',
    'Source Name': 'Outlet 2',
    'Destination Name': 'Main Store',
    'Invoice Date': '11 May 2024',
    'Total Item Number': 22,
    'Cost': '₹6,150',
  },
  {
    'Transaction ID': '#TRN-003',
    'Invoice Number': 'INV-2024-203',
    'Source Name': 'Main Store',
    'Destination Name': 'Outlet 2',
    'Invoice Date': '10 May 2024',
    'Total Item Number': 28,
    'Cost': '₹7,840',
  },
  {
    'Transaction ID': '#TRN-004',
    'Invoice Number': 'INV-2024-204',
    'Source Name': 'Outlet 1',
    'Destination Name': 'Outlet 2',
    'Invoice Date': '09 May 2024',
    'Total Item Number': 18,
    'Cost': '₹5,040',
  },
];

export default function StockTransferPage() {
  return (
    <InventoryShell
      breadcrumb={[{ label: 'Inventory' }, { label: 'Stock Transfer' }]}
      title="Stock Transfer"
      subtitle="Stock Transfer transaction history of last 7 days. Need Help?"
      actions={[{ label: 'Bulk Operations' }, { label: 'Stock Transfer', primary: true }]}
      searchPlaceholder="Search"
      filters={['Date Range', 'Select Source']}
      tableHeaders={tableHeaders}
      tableData={tableData}
    />
  );
}