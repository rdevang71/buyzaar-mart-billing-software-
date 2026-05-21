export async function fetchInventoryProducts({ storeId, search = '', page = 1, pageSize = 20, signal } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (storeId !== undefined && storeId !== null && String(storeId).trim() !== '') {
    params.set('store_id', String(storeId));
  }

  if (search.trim()) {
    params.set('search', search.trim());
  }

  const response = await fetch(`/api/inventory/products?${params.toString()}`, { signal });
  const json = await response.json();
  const records = json?.data?.records ?? json?.records ?? [];

  return Array.isArray(records) ? records.map(normalizeInventoryProduct) : [];
}

export function normalizeInventoryProduct(product) {
  return {
    id: product.id ?? product.product_id,
    productId: product.product_id ?? product.id,
    name: product.name || product.product || '',
    sku: product.sku || '',
    barcode: product.barcode || '',
    mrp: Number(product.mrp || 0),
    sellingPrice: Number(product.sellingPrice ?? product.selling_price ?? product.mrp ?? 0),
    costPrice: Number(product.costPrice ?? product.cost_price ?? 0),
    categoryName: product.categoryName || product.category_name || 'N/A',
    brandName: product.brandName || product.brand_name || '',
    availableStock: Number(product.availableStock ?? product.available_stock ?? 0),
    taxRate: Number(product.taxRate ?? product.tax_rate ?? 0),
  };
}