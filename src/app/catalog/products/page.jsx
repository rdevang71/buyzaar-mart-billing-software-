'use client';

import { useEffect, useMemo, useState } from 'react';
import CatalogDataPage from '@/components/CatalogDataPage';

const columns = [
  { key: 'sno',      label: 'S. No.',        sortable: true },
  { key: 'name',     label: 'Product Name',  sortable: true },
  { key: 'category', label: 'Category',      sortable: true },
  { key: 'brand',    label: 'Brand',         sortable: true },
  { key: 'price',    label: 'Price',         sortable: true },
  { key: 'stock',    label: 'Stock',         sortable: true },
];

export default function ProductsPage() {
  const [departmentId, setDepartmentId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [deptRes, brandRes, catRes] = await Promise.all([
          fetch('/api/catalog/departments?pageSize=200'),
          fetch('/api/catalog/brands?pageSize=200'),
          fetch('/api/catalog/categories?pageSize=200'),
        ]);
        const deptJson = await deptRes.json();
        const brandJson = await brandRes.json();
        const catJson = await catRes.json();
        if (deptJson.success) setDepartments(deptJson.data.records || []);
        if (brandJson.success) setBrands(brandJson.data.records || []);
        if (catJson.success) setCategories(catJson.data.records || []);
      } catch {
        setDepartments([]);
        setBrands([]);
        setCategories([]);
      }
    })();
  }, []);

  const filters = useMemo(() => (
    <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Department</label>
        <select
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">ALL</option>
          {departments.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Brand</label>
        <select
          value={brandId}
          onChange={(event) => setBrandId(event.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">ALL</option>
          {brands.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Category</label>
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">ALL</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </div>
    </div>
  ), [brandId, brands, categoryId, categories, departmentId, departments]);

  return (
    <CatalogDataPage
      endpoint="/api/catalog/products"
      breadcrumbs={[
        { label: 'Catalog', href: '/catalog' },
        { label: 'Product', href: '/catalog/products' },
        { label: 'Products' },
      ]}
      title="Products"
      description="Manage all products in your catalog."
      columns={columns}
      filters={filters}
      createLabel="Create Product"
      onCreateClick={() => window.location.href = '/catalog/products/create'}
      showRowActions={true}
      onEdit={(row) => window.location.href = `/catalog/products/${row.id}/edit`}
      onDelete={(row) => {/* delete handled by CatalogDataPage */}}
      totalLabel="Product(s)"
      emptyMessage="No products found"
      extraQueryParams={{ department_id: departmentId, brand_id: brandId, category_id: categoryId }}
      mapRecord={(record, index, page, pageSize) => ({
        id: record.id,
        sno: (page - 1) * pageSize + index + 1,
        name: record.name,
        category: record.category_name || '—',
        brand: record.brand_name || '—',
        price: `₹${record.selling_price ?? record.mrp ?? 0}`,
        stock: record.actual_stock ?? '—',
      })}
    />
  );
}