'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import InventoryShell from '@/components/inventory/InventoryShell';

const tableHeaders = [
  'S. No.',
  'Product',
  'SKU',
  'Location',
  'Batch No',
  'MFG Date',
  'Expiry Date',
  'Current Qty',
  'Received Qty',
  'Cost',
  'Status',
];

function formatDate(value) {
  if (!value) return '-';
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

async function fetchBatches() {
  const res = await fetch('/api/inventory/batches');
  if (!res.ok) throw new Error('Failed to fetch batches');
  return res.json();
}

export default function BatchesPage() {
  const router = useRouter();
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchBatches()
      .then((data) => setRecords(Array.isArray(data) ? data : []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((row) =>
      [row.batchName, row.product, row.sku, row.store, row.locationType, row.expiryStatus]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [records, search]);

  const tableData = useMemo(() => {
    return filtered.map((row, idx) => ({
      'S. No.': idx + 1,
      Product: row.product || '-',
      SKU: row.sku || '-',
      Location: row.store ? `${row.store}${row.locationType ? ` (${row.locationType})` : ''}` : '-',
      'Batch No': row.batchName || '-',
      'MFG Date': formatDate(row.mfgDate),
      'Expiry Date': formatDate(row.expiryDate),
      'Current Qty': row.items ?? 0,
      'Received Qty': row.receivedItems ?? 0,
      Cost: formatCurrency(row.cost),
      Status: row.expiryStatus || row.status || '-',
    }));
  }, [filtered]);

  return (
    <InventoryShell
      breadcrumb={[{ label: 'Inventory' }, { label: 'Batches' }]}
      title="Batches"
      subtitle="List of all batches"
      actions={[{ label: 'Add In Bulk (Excel)', primary: true, onClick: () => router.push('/inventory/stockin') }]}
      searchPlaceholder="Search"
      searchValue={search}
      onSearchChange={setSearch}
      tableHeaders={tableHeaders}
      tableData={loading ? [] : tableData}
      emptyMessage={loading ? 'Loading records...' : 'No Records Found'}
    />
  );
}
