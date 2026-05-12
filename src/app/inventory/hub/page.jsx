import InventoryShell from '@/components/inventory/InventoryShell';

const stats = [
  { label: 'On-hand value', note: 'Stock × price' },
  { label: 'Stockout risk', note: 'Needs live stock feed' },
  { label: 'Low moving', note: 'Needs live stock feed' },
  { label: 'Total SKUs', value: '10', note: '' },
];

const insights = [
  {
    title: 'Restock coach',
    text: "We'll flag SKUs approaching reorder level once reorderLevel is set.",
    button: 'Stock operations',
  },
  {
    title: 'Transfer suggestions',
    text: 'Rebalance slow-moving stock between stores before it expires.',
    button: 'Stock transfer',
  },
  {
    title: 'Batch attention',
    text: 'Short-shelf-life items flagged for first-in-first-out review.',
    button: 'Expiring',
  },
];

const cards = [
  { title: 'Stock operations', text: 'Unified in/out/transfer/audit workspace.' },
  { title: 'Stock in', text: 'Receive stock with GRN and cost capture.' },
  { title: 'Stock out', text: 'Record outgoing stock and wastage.' },
  { title: 'Stock transfer', text: 'Move stock between stores or warehouses.' },
  { title: 'Purchase orders', text: 'Draft, approve, receive vendor POs.' },
  { title: 'Expiring batches', text: 'Batches approaching best-before.' },
  { title: 'Batches', text: 'Lot codes, expiry, batch-wise stock.' },
  { title: 'Vendors', text: 'Supplier list and vendor-specific catalog.' },
];

export default function InventoryHubPage() {
  return (
    <InventoryShell
      breadcrumb={[{ label: 'Home' }, { label: 'Inventory' }]}
      title="Inventory"
      subtitle="Stock on hand, purchase orders, transfers and shrinkage across every store."
      actions={[]}
      searchPlaceholder="Search"
      stats={stats}
      insights={insights}
      cards={cards}
      showTable={false}
    />
  );
}