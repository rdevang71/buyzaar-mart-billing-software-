"use client";

import { useEffect, useMemo, useState } from 'react';
import InventoryShell from '@/components/inventory/InventoryShell';

const baseStats = [
  { key: 'inventory_value_retail', label: 'On-hand value', note: 'Stock × price' },
  { key: 'stockout_risk', label: 'Stockout risk', note: 'Low-stock SKUs' },
  { key: 'low_moving', label: 'Low moving', note: 'Slow-moving SKUs' },
  { key: 'total_products', label: 'Total SKUs', note: 'Live product count' },
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadOverview = async () => {
      try {
        const params = new URLSearchParams();
        params.set('date_from', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
        params.set('date_to', new Date().toISOString().split('T')[0]);

        const res = await fetch(`/api/dashboard/analytics?${params}`);
        if (!res.ok) throw new Error('Failed to load inventory overview');

        const json = await res.json();
        if (mounted && json.success && json.data) {
          setData(json.data);
        }
      } catch (err) {
        console.error('[inventory hub]', err);
        if (mounted) setData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadOverview();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const inventory = data?.inventory || {};
    const stockAlerts = Array.isArray(data?.stock_alerts) ? data.stock_alerts : [];
    const movingItems = Array.isArray(data?.moving_items) ? data.moving_items : [];

    const formatCurrency = (value) =>
      `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    const riskCount = stockAlerts.filter((item) => Number(item.current_stock || 0) <= Number(item.reorder_level || 0)).length;
    const lowMovingCount = movingItems.filter((item) => String(item.movement_category || '').toLowerCase() === 'slow-moving').length;

    return baseStats.map((stat) => {
      if (stat.key === 'inventory_value_retail') {
        return { label: stat.label, note: stat.note, value: formatCurrency(inventory.inventory_value_retail) };
      }
      if (stat.key === 'stockout_risk') {
        return { label: stat.label, note: stat.note, value: String(riskCount) };
      }
      if (stat.key === 'low_moving') {
        return { label: stat.label, note: stat.note, value: String(lowMovingCount) };
      }
      if (stat.key === 'total_products') {
        return { label: stat.label, note: stat.note, value: String(inventory.total_products || 0) };
      }
      return { label: stat.label, note: stat.note, value: '-' };
    });
  }, [data]);

  return (
    <InventoryShell
      breadcrumb={[{ label: 'Home' }, { label: 'Inventory' }]}
      title="Inventory"
      subtitle="Stock on hand, purchase orders, transfers and shrinkage across every store."
      actions={[]}
      searchPlaceholder="Search"
      stats={loading ? baseStats.map((stat) => ({ label: stat.label, note: stat.note })) : stats}
      insights={insights}
      cards={cards}
      showTable={false}
    />
  );
}