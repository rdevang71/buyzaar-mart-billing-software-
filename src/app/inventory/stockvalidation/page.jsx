import InventoryShell from '@/components/inventory/InventoryShell';

const tableHeaders = [
  'Transaction ID',
  'Invoice Number',
  'Source Name',
  'Invoice Date',
  'Total Item Number',
  'Cost',
];

const tableData = [
  {
    'Transaction ID': '#AUD-001',
    'Invoice Number': 'INV-2024-301',
    'Source Name': 'Main Store',
    'Invoice Date': '12 May 2024',
    'Total Item Number': 52,
    'Cost': '₹14,560',
  },
  {
    'Transaction ID': '#AUD-002',
    'Invoice Number': 'INV-2024-302',
    'Source Name': 'Outlet 1',
    'Invoice Date': '11 May 2024',
    'Total Item Number': 38,
    'Cost': '₹10,640',
  },
  {
    'Transaction ID': '#AUD-003',
    'Invoice Number': 'INV-2024-303',
    'Source Name': 'Outlet 2',
    'Invoice Date': '10 May 2024',
    'Total Item Number': 41,
    'Cost': '₹11,480',
  },
  {
    'Transaction ID': '#AUD-004',
    'Invoice Number': 'INV-2024-304',
    'Source Name': 'Main Store',
    'Invoice Date': '09 May 2024',
    'Total Item Number': 48,
    'Cost': '₹13,440',
  },
];

export default function StockValidationPage() {
  return (
    <InventoryShell
      breadcrumb={[{ label: 'Inventory' }, { label: 'Stock Validation' }]}
      title="Stock Validation"
      subtitle="Stock Validation transaction history of last 7 days. Need Help?"
      actions={[{ label: 'Audit In Bulk (Excel)' }, { label: 'Audit', primary: true }]}
      searchPlaceholder="Search"
      filters={['Date Range', 'Select Source']}
      tableHeaders={tableHeaders}
      tableData={tableData}
    />
  );
}