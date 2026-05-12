'use client';
import CatalogListPage from '@/components/CatalogListPage';

const rows = [
  { id: 1, sno: 1, code: 'SAVE50',   value: '₹50',  minOrder: '₹500',  expiry: '31 Dec 2025', used: 5 },
  { id: 2, sno: 2, code: 'FLAT100',  value: '₹100', minOrder: '₹1000', expiry: '31 Mar 2026', used: 2 },
];
const columns = [
  { key: 'sno',      label: 'S. No.',       sortable: true },
  { key: 'code',     label: 'Voucher Code', sortable: true },
  { key: 'value',    label: 'Value',        sortable: true },
  { key: 'minOrder', label: 'Min. Order',   sortable: true },
  { key: 'expiry',   label: 'Expiry',       sortable: true },
  { key: 'used',     label: 'Times Used',   sortable: true },
];

export default function VouchersPage() {
  return (
    <CatalogListPage
      breadcrumbs={[{ label:'Catalog',href:'/catalog'},{ label:'Promotional Products'},{ label:'Vouchers'}]}
      title="Vouchers" description="Create and manage discount vouchers for customers."
      createLabel="Create Voucher" columns={columns} rows={rows}
    />
  );
}