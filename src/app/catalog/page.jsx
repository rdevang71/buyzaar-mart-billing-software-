'use client';

import { useCatalogList } from '@/hooks/useCatalogList';
import CatalogListPage from '@/components/CatalogListPage';

const columns = [
  { key: 'sno',         label: 'S. No.',     sortable: true },
  { key: 'name',        label: 'Name',        sortable: true },
  { key: 'description', label: 'Description', sortable: false },
  { key: 'is_active',   label: 'Status',      sortable: true },
  { key: 'created_at',  label: 'Created At',  sortable: true },
];

export default function CategoryPage() {
  const {
    records, total, totalPages,
    page, pageSize, search, loading, error,
    setPage, setPageSize, setSearch,
    deleteRecord,
  } = useCatalogList('/api/catalog/categories');

  // Add serial number to rows
  const rows = records.map((r, i) => ({
    ...r,
    sno: (page - 1) * pageSize + i + 1,
    is_active: r.is_active ? 'Active' : 'Inactive',
    created_at: new Date(r.created_at).toLocaleDateString('en-IN'),
  }));

  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Catalog', href: '/catalog' },
        { label: 'Category' },
      ]}
      title="Category"
      description="Manage product categories. Need Help?"
      createLabel="Create Category"
      onCreateClick={() => {/* open modal or navigate */}}
      bulkOperations={true}
      columns={columns}
      rows={rows}
      loading={loading}
      error={error}
      totalLabel="Categories"
      emptyMessage="No categories found"
      // Pagination
      page={page}
      pageSize={pageSize}
      totalPages={totalPages}
      total={total}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      // Search
      search={search}
      onSearchChange={setSearch}
      // Row actions
      showRowActions={true}
      onDelete={deleteRecord}
    />
  );
}