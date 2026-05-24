import { query } from '@/lib/db';
import { successResponse, errorResponse, validationError } from '@/lib/api-response';
import { ensureCatalogExtrasSchema } from '@/lib/catalogExtrasSchema';
import { requireAuth, requirePermission, requireStore } from '@/lib/api-protection';

function rowToBool(value) {
  return value === true || value === 'true';
}

export async function GET(request) {
  try {
    await ensureCatalogExtrasSchema();
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const permissionCheck = requirePermission(auth.user, 'VIEW_CATALOG', 'MANAGE_CATALOG');
    if (permissionCheck.error) return permissionCheck.error;

    const { searchParams } = new URL(request.url);
    const storeId = Number(searchParams.get('storeId') || searchParams.get('store_id') || 0) || null;
    const search = String(searchParams.get('search') || '').trim();
    if (!storeId) return validationError([{ field: 'storeId', message: 'Store is required' }]);
    const storeCheck = requireStore(auth.user, storeId);
    if (storeCheck.error) return storeCheck.error;

    const params = [storeId];
    const where = ['p.is_active IS DISTINCT FROM false'];
    if (search) {
      params.push(`%${search}%`);
      where.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.barcode ILIKE $${params.length} OR p.product_id ILIKE $${params.length})`);
    }

    const res = await query(
      `SELECT p.id, p.product_id, p.name, p.barcode, p.sku, p.mrp, p.selling_price,
              COALESCE(ps.low_stock_value, 0) AS low_stock_level,
              COALESCE(ps.low_stock_value, 0) AS safe_stock_level,
              COALESCE(ps.is_active, false) AS is_assigned,
              COALESCE(ps.selling_price, p.selling_price, 0) AS store_selling_price,
              COALESCE(ps.mrp, p.mrp, 0) AS store_mrp
       FROM products p
       LEFT JOIN product_saleability ps ON ps.product_id = p.id AND ps.store_id = $1
       WHERE ${where.join(' AND ')}
       ORDER BY p.name ASC
       LIMIT 1000`,
      params
    );

    return successResponse({ records: res.rows }, 'Products fetched');
  } catch (err) {
    console.error('[assign-products-store GET]', err);
    return errorResponse('Failed to fetch products');
  }
}

export async function POST(request) {
  try {
    await ensureCatalogExtrasSchema();
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const permissionCheck = requirePermission(auth.user, 'MANAGE_CATALOG');
    if (permissionCheck.error) return permissionCheck.error;

    const body = await request.json().catch(() => ({}));
    const productId = Number(body.productId || body.product_id || 0) || null;
    const storeId = Number(body.storeId || body.store_id || 0) || null;
    if (!productId || !storeId) return validationError([{ field: 'productId', message: 'Product and store are required' }]);
    const storeCheck = requireStore(auth.user, storeId);
    if (storeCheck.error) return storeCheck.error;

    const assign = body.assign !== false && body.is_active !== false;
    if (assign) {
      const product = await query('SELECT mrp, selling_price FROM products WHERE id = $1', [productId]);
      await query(
        `INSERT INTO product_saleability (product_id, store_id, is_active, selling_price, mrp, low_stock_value, created_at, updated_at)
         VALUES ($1, $2, true, COALESCE($3, 0), COALESCE($4, 0), 0, NOW(), NOW())
         ON CONFLICT (product_id, store_id) DO UPDATE SET is_active = true, updated_at = NOW()`,
        [productId, storeId, product.rows[0]?.selling_price || 0, product.rows[0]?.mrp || 0]
      );
    } else {
      await query(
        `UPDATE product_saleability SET is_active = false, updated_at = NOW() WHERE product_id = $1 AND store_id = $2`,
        [productId, storeId]
      );
    }

    return successResponse({ productId, storeId, isAssigned: rowToBool(assign) }, assign ? 'Product assigned' : 'Product unassigned');
  } catch (err) {
    console.error('[assign-products-store POST]', err);
    return errorResponse('Failed to update assignment');
  }
}
