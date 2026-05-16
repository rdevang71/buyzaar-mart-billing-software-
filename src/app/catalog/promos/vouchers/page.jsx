'use client';
import CatalogDataPage from '@/components/CatalogDataPage';
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
    <CatalogDataPage
      endpoint="/api/catalog/vouchers"
      breadcrumbs={[{ label:'Catalog',href:'/catalog'},{ label:'Promotional Products'},{ label:'Vouchers'}]}
      title="Vouchers" description="Create and manage discount vouchers for customers."
      columns={columns}
      totalLabel="Voucher(s)"
      emptyMessage="No vouchers found"
      mapRecord={(record, index, page, pageSize) => ({
        id: record.id,
        sno: (page - 1) * pageSize + index + 1,
        code: record.code,
        value: `₹${record.value}`,
        minOrder: `₹${record.min_order}`,
        expiry: record.expiry_date || '—',
        used: record.used_count,
      })}
    />
  );
}