'use client';

import CatalogDataPage from '@/components/CatalogDataPage';

const columns = [
  { key: 'sno',      label: 'S. No.',          sortable: true },
  { key: 'name',     label: 'Department Name', sortable: true },
  { key: 'manager',  label: 'Manager',         sortable: true },
  { key: 'sequence', label: 'Sort Sequence',   sortable: true },
];

export default function DepartmentPage() {
  return (
    <CatalogDataPage
      endpoint="/api/catalog/departments"
      breadcrumbs={[
        { label: 'Catalog', href: '/catalog' },
        { label: 'Product Classification', href: '/catalog/category' },
        { label: 'Department' },
      ]}
      title="Department"
      description="Manage departments to organize your store sections."
      columns={columns}
      totalLabel="Department(s)"
      emptyMessage="No departments found"
      mapRecord={(record, index, page, pageSize) => ({
        id: record.id,
        sno: (page - 1) * pageSize + index + 1,
        name: record.name,
        manager: record.code || '—',
        sequence: index + 1,
      })}
    />
  );
}