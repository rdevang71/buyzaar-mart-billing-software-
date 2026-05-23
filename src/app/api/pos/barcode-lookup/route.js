import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { getAssignedStoreIds, requireAuth, requireStore } from '@/lib/api-protection';

export async function GET(req) {
  try {
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const barcode = searchParams.get('barcode');
    const sku = searchParams.get('sku');
    let store_id = Number(searchParams.get('store_id') || 0) || null;

    if (!barcode && !sku) {
      return errorResponse('barcode or sku required', 400);
    }

    let searchQuery = `
      SELECT 
        p.id, p.name, p.sku, p.barcode, p.mrp, p.cost_price,
        COALESCE(sii.qty, 0) as stock,
        c.name as category,
        b.name as brand,
        COALESCE(t.rate, 0) as tax_rate,
        p.image_url
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN taxes t ON p.tax_id = t.id
      LEFT JOIN stock_in_items sii ON p.id = sii.product_id
      WHERE 1=1
    `;

    const params = [];

    if (barcode) {
      searchQuery += ` AND p.barcode = $${params.length + 1}`;
      params.push(barcode);
    }

    if (sku) {
      searchQuery += ` AND p.sku = $${params.length + 1}`;
      params.push(sku);
    }

    if (!store_id && auth.user.role !== 'super_admin') {
      store_id = getAssignedStoreIds(auth.user)[0] || null;
    }

    if (store_id) {
      const storeCheck = requireStore(auth.user, store_id);
      if (storeCheck.error) return storeCheck.error;

      searchQuery += ` AND p.store_id = $${params.length + 1}`;
      params.push(store_id);
    } else if (auth.user.role !== 'super_admin') {
      searchQuery += ` AND 1 = 0`;
    }

    const res = await query(searchQuery, params);

    if (!res.rows.length) {
      return errorResponse('Product not found', 404);
    }

    return successResponse(res.rows[0]);
  } catch (err) {
    return errorResponse(err.message);
  }
}
