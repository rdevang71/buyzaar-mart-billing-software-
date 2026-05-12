'use client';
import CatalogListPage from '@/components/CatalogListPage';

const rows = [
  { id: 1, sno: 1, name: 'Gold Member',   discount: '10%', validity: '1 Year',  members: 12 },
  { id: 2, sno: 2, name: 'Silver Member', discount: '5%',  validity: '6 Months',members: 28 },
];
const columns = [
  { key: 'sno',      label: 'S. No.',            sortable: true },
  { key: 'name',     label: 'Membership Name',   sortable: true },
  { key: 'discount', label: 'Discount',          sortable: true },
  { key: 'validity', label: 'Validity',          sortable: true },
  { key: 'members',  label: 'Active Members',    sortable: true },
];

export default function MembershipsPage() {
  return (
    <CatalogListPage
      breadcrumbs={[{ label:'Catalog',href:'/catalog'},{ label:'Promotional Products'},{ label:'Memberships'}]}
      title="Memberships" description="Manage customer membership plans and benefits."
      createLabel="Create Membership" columns={columns} rows={rows}
    />
  );
}