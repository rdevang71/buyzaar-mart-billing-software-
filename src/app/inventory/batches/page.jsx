'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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

function formatDate(value) {
  if (!value) return '-';
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
      [row.batchName, row.barcode, row.user, row.remarks]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [records, search]);

  const tableData = useMemo(() => {
    return filtered.map((row, idx) => ({
      'S. No.': idx + 1,
      'Batch Name': row.batchName || '-',
      Barcode: row.barcode || '-',
      Date: formatDate(row.timestamp),
      Time: formatTime(row.timestamp),
      Cost: formatCurrency(row.cost),
      Items: row.items ?? 0,
      User: row.user || 'System',
      Remarks: row.remarks || '-',
      'View Products': row.id ? 'Open Stock In' : '-',
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