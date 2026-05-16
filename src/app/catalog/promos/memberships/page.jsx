'use client';
import CatalogDataPage from '@/components/CatalogDataPage';
const columns = [
  { key: 'sno',      label: 'S. No.',            sortable: true },
  { key: 'name',     label: 'Membership Name',   sortable: true },
  { key: 'discount', label: 'Discount',          sortable: true },
  { key: 'validity', label: 'Validity',          sortable: true },
  { key: 'members',  label: 'Active Members',    sortable: true },
];

export default function MembershipsPage() {
  return (
    <CatalogDataPage
      endpoint="/api/catalog/memberships"
      breadcrumbs={[{ label:'Catalog',href:'/catalog'},{ label:'Promotional Products'},{ label:'Memberships'}]}
      title="Memberships" description="Manage customer membership plans and benefits."
      columns={columns}
      totalLabel="Membership(s)"
      emptyMessage="No memberships found"
      mapRecord={(record, index, page, pageSize) => ({
        id: record.id,
        sno: (page - 1) * pageSize + index + 1,
        name: record.name,
        discount: record.discount,
        validity: record.validity,
        members: record.members,
      })}
    />
  );
}