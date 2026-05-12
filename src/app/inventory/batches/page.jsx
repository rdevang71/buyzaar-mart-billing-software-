import InventoryShell from '@/components/inventory/InventoryShell';

const tableHeaders = [
  'S. No.',
  'Batch Name',
  'Barcode',
  'Date',
  'Time',
  'Cost',
  'Items',
  'User',
  'Remarks',
  'View Products',
];

const tableData = [
  {
    'S. No.': '1',
    'Batch Name': 'Batch-2024-May-001',
    'Barcode': '841856028456',
    'Date': '12 May 2024',
    'Time': '10:30 AM',
    'Cost': '₹24,500',
    'Items': 45,
    'User': 'Amit Sharma',
    'Remarks': 'Processed',
    'View Products': 'View',
  },
  {
    'S. No.': '2',
    'Batch Name': 'Batch-2024-May-002',
    'Barcode': '841856028457',
    'Date': '11 May 2024',
    'Time': '02:15 PM',
    'Cost': '₹18,200',
    'Items': 32,
    'User': 'Priya Verma',
    'Remarks': 'Processed',
    'View Products': 'View',
  },
  {
    'S. No.': '3',
    'Batch Name': 'Batch-2024-May-003',
    'Barcode': '841856028458',
    'Date': '10 May 2024',
    'Time': '09:45 AM',
    'Cost': '₹31,800',
    'Items': 58,
    'User': 'Rajesh Kumar',
    'Remarks': 'Processed',
    'View Products': 'View',
  },
  {
    'S. No.': '4',
    'Batch Name': 'Batch-2024-May-004',
    'Barcode': '841856028459',
    'Date': '09 May 2024',
    'Time': '11:20 AM',
    'Cost': '₹15,300',
    'Items': 27,
    'User': 'Neha Singh',
    'Remarks': 'Processed',
    'View Products': 'View',
  },
  {
    'S. No.': '5',
    'Batch Name': 'Batch-2024-May-005',
    'Barcode': '841856028460',
    'Date': '08 May 2024',
    'Time': '03:50 PM',
    'Cost': '₹22,600',
    'Items': 41,
    'User': 'Vivek Patel',
    'Remarks': 'Processed',
    'View Products': 'View',
  },
];

export default function BatchesPage() {
  return (
    <InventoryShell
      breadcrumb={[{ label: 'Inventory' }, { label: 'Batches' }]}
      title="Batches"
      subtitle="List of all batches"
      actions={[{ label: 'Add In Bulk (Excel)', primary: true }]}
      searchPlaceholder="Search"
      tableHeaders={tableHeaders}
      tableData={tableData}
    />
  );
}