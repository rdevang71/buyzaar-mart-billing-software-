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
    href: '/inventory/ops',
  },
  {
    title: 'Transfer suggestions',
    text: 'Rebalance slow-moving stock between stores before it expires.',
    button: 'Stock transfer',
    href: '/inventory/stocktransfer',
  },
  {
    title: 'Batch attention',
    text: 'Short-shelf-life items flagged for first-in-first-out review.',
    button: 'Expiring',
    href: '/inventory/batches',
  },
];

const cards = [
  { title: 'Stock operations', text: 'Unified in/out/transfer/audit workspace.', href: '/inventory/ops' },
  { title: 'Stock in', text: 'Receive stock with GRN and cost capture.', href: '/inventory/stockin' },
  { title: 'Stock out', text: 'Record outgoing stock and wastage.', href: '/inventory/stockout' },
  { title: 'Stock transfer', text: 'Move stock between stores or warehouses.', href: '/inventory/stocktransfer' },
  { title: 'Purchase orders', text: 'Draft, approve, receive vendor POs.', href: '/purchase/purchase-orders' },
  { title: 'Expiring batches', text: 'Batches approaching best-before.', href: '/inventory/batches' },
  { title: 'Batches', text: 'Lot codes, expiry, batch-wise stock.', href: '/inventory/batches' },
  { title: 'Vendors', text: 'Supplier list and vendor-specific catalog.', href: '/purchase/vendors' },
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