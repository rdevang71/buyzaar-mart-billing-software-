"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import InventoryShell from '@/components/inventory/InventoryShell';

async function fetchGrnList() {
  const res = await fetch('/api/purchase/grns');
  if (!res.ok) throw new Error('Failed to fetch GRN records');
  return res.json();
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCost(value) {
  const n = Number(value || 0);
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function mapRecordsToTable(records) {
  return (records || []).map((row) => ({
    'Transaction ID': row.transactionId ? `#${row.transactionId}` : `#GRN-${row.id}`,
    'Invoice Number': row.invoiceNumber || '—',
    'Destination': row.destination || '—',
    'Invoice Date': formatDate(row.invoiceDate),
    'Total Item Number': row.totalItems ?? 0,
    'Cost': formatCost(row.cost),
    'Reference Transaction Type': row.referenceType || '—',
    'Reference ID': row.referenceId || '—',
  }));
}

export default function GrnListPage() {
  const [tableData, setTableData] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setLoadingList(true);
    fetchGrnList()
      .then((data) => setTableData(mapRecordsToTable(data)))
      .catch(() => setTableData([]))
      .finally(() => setLoadingList(false));
  }, []);

  const handleCreate = () => router.push('/purchase/grn/create');

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

  return (
    <>
      <InventoryShell
        breadcrumb={[{ label: 'Purchase' }, { label: 'GRN' }]}
        title="Purchase GRN"
        subtitle="Goods Received Notes linked to Purchase Orders"
        actions={[{ label: 'Create GRN', primary: true, onClick: handleCreate }]}
        searchPlaceholder="Search GRNs"
        filters={['Date Range', 'Supplier']}
        tableHeaders={tableHeaders}
        tableData={loadingList ? [] : tableData}
        emptyMessage={loadingList ? 'Loading records…' : 'No Records Found'}
      />
    </>
  );
}
