'use client';

import CatalogDataPage from '@/components/CatalogDataPage';

const columns = [
  { key: 'sno',     label: 'S. No.',       sortable: true },
  { key: 'name',    label: 'Charge Name',  sortable: true },
  { key: 'amount',  label: 'Amount',       sortable: true },
  { key: 'applies', label: 'Applies To',   sortable: true },
  { key: 'type',    label: 'Type',         sortable: true },
];

export default function ChargesPage() {
  return (
    <CatalogDataPage
      endpoint="/api/catalog/charges"
      breadcrumbs={[
        { label: 'Catalog', href: '/catalog' },
        { label: 'Taxes & Charges', href: '/catalog/taxes' },
        { label: 'Charges' },
      ]}
      title="Charges"
      description="Set up additional charges applied during billing."
      columns={columns}
      totalLabel="Charge(s)"
      emptyMessage="No charges found"
      mapRecord={(record, index, page, pageSize) => ({
        id: record.id,
        sno: (page - 1) * pageSize + index + 1,
        name: record.name,
        amount: `₹${record.amount}`,
        applies: record.applies || '—',
        type: record.charge_type,
      })}
    />
  );
}