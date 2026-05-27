import { NextResponse } from 'next/server';
import { getClient, query } from '@/lib/db';
import { ensureProcurementSchema } from '@/lib/procurementSchema';
import { appendStoreScope, requireAuth, requirePermission, requireStore } from '@/lib/api-protection';

function toNum(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(request) {
  try {
    await ensureProcurementSchema();
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const permissionCheck = requirePermission(auth.user, 'MANAGE_PURCHASE_ORDERS', 'VIEW_INVENTORY', 'MANAGE_INVENTORY');
    if (permissionCheck.error) return permissionCheck.error;

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') || searchParams.get('store_id');
    const search = String(searchParams.get('search') || '').trim();
    const params = [];
    const where = ['ps.is_active = TRUE'];
    const scope = appendStoreScope(where, params, 'ps.store_id', auth.user, storeId);
    if (scope.error) return scope.error;
    if (search) {
      params.push(`%${search}%`);
      where.push(`(
        COALESCE(p.name, '') ILIKE $${params.length}
        OR COALESCE(p.sku, '') ILIKE $${params.length}
        OR COALESCE(p.barcode, '') ILIKE $${params.length}
        OR COALESCE(p.product_id, '') ILIKE $${params.length}
      )`);
    }

    const res = await query(
      `WITH stock AS (
         SELECT product_id, store_id, COALESCE(SUM(available_qty), 0) AS available_qty
         FROM inventory_batches
         WHERE status = 'active'
         GROUP BY product_id, store_id
       )
       SELECT
         p.id AS product_id,
         p.product_id AS product_code,
         p.name AS product_name,
         p.sku,
         ps.store_id,
         s.name AS store_name,
         COALESCE(stock.available_qty, 0) AS current_stock,
         COALESCE(NULLIF(ps.low_stock_value, 0), 10) AS reorder_level,
         GREATEST(COALESCE(NULLIF(ps.low_stock_value, 0), 10) * 2 - COALESCE(stock.available_qty, 0), 0) AS suggested_qty,
         COALESCE(p.cost_price, 0) AS cost_price,
         last_vendor.vendor_id,
         last_vendor.vendor_name
       FROM product_saleability ps
       JOIN products p ON p.id = ps.product_id
       JOIN stores s ON s.id = ps.store_id
       LEFT JOIN stock ON stock.product_id = ps.product_id AND stock.store_id = ps.store_id
       LEFT JOIN LATERAL (
         SELECT si.vendor_id, COALESCE(v.name, si.vendor_name) AS vendor_name
         FROM stock_in_items sii
         JOIN stock_in si ON si.id = sii.stock_in_id
         LEFT JOIN vendors v ON v.id = si.vendor_id
         WHERE sii.product_id = p.id AND si.vendor_id IS NOT NULL
         ORDER BY si.confirmed_at DESC NULLS LAST, si.created_at DESC
         LIMIT 1
       ) last_vendor ON TRUE
       WHERE ${where.join(' AND ')}
         AND COALESCE(stock.available_qty, 0) <= COALESCE(NULLIF(ps.low_stock_value, 0), 10)
       ORDER BY suggested_qty DESC, p.name ASC
       LIMIT 500`,
      params
    );

    return NextResponse.json(res.rows.map((row) => ({
      productId: row.product_id,
      productCode: row.product_code || '',
      productName: row.product_name || '',
      sku: row.sku || '',
      storeId: row.store_id,
      storeName: row.store_name || '',
      currentStock: Number(row.current_stock || 0),
      reorderLevel: Number(row.reorder_level || 0),
      suggestedQty: Number(row.suggested_qty || 0),
      costPrice: Number(row.cost_price || 0),
      vendorId: row.vendor_id,
      vendorName: row.vendor_name || '',
    })));
  } catch (err) {
    console.error('[purchase reorder GET]', err.message);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request) {
  const client = await getClient();
  try {
    await ensureProcurementSchema();
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const permissionCheck = requirePermission(auth.user, 'MANAGE_PURCHASE_ORDERS');
    if (permissionCheck.error) return permissionCheck.error;

    const body = await request.json().catch(() => ({}));
    const storeId = toNum(body.storeId || body.store_id, 0);
    const vendorId = toNum(body.vendorId || body.vendor_id, 0);
    const inputItems = Array.isArray(body.items) ? body.items : [];
    if (!storeId) return NextResponse.json({ error: 'Store is required' }, { status: 400 });
    if (!vendorId) return NextResponse.json({ error: 'Vendor is required' }, { status: 400 });
    if (!inputItems.length) return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    const storeCheck = requireStore(auth.user, storeId);
    if (storeCheck.error) return storeCheck.error;

    await client.query('BEGIN');
    const po = await client.query(
      `INSERT INTO purchase_orders (
         destination_id, vendor_id, expected_delivery_date, status, meta, created_at
       ) VALUES ($1,$2,$3,'draft',$4::jsonb,NOW())
       RETURNING id`,
      [
        storeId,
        vendorId,
        body.expectedDeliveryDate || body.expected_delivery_date || null,
        JSON.stringify({ ...body, source: 'auto_reorder' }),
      ]
    );
    const poId = po.rows[0].id;
    const transactionId = `PO-${String(poId).padStart(4, '0')}`;
    await client.query('UPDATE purchase_orders SET transaction_id = $1 WHERE id = $2', [transactionId, poId]);

    let totalItems = 0;
    let totalCost = 0;
    for (const item of inputItems) {
      const productId = toNum(item.productId || item.product_id, 0);
      const qty = toNum(item.qty || item.suggestedQty || item.suggested_qty, 0);
      const costPrice = toNum(item.costPrice || item.cost_price, 0);
      if (!productId || qty <= 0) continue;
      const product = await client.query('SELECT name, cost_price FROM products WHERE id = $1', [productId]);
      const productName = item.productName || item.product_name || product.rows[0]?.name || null;
      const cost = costPrice || toNum(product.rows[0]?.cost_price, 0);
      await client.query(
        `INSERT INTO purchase_order_items (purchase_order_id, product_id, product_name, qty, cost_price, tax_value)
         VALUES ($1,$2,$3,$4,$5,0)`,
        [poId, productId, productName, qty, cost]
      );
      totalItems += qty;
      totalCost += qty * cost;
    }

    await client.query(
      `UPDATE purchase_orders
       SET total_items = $2, total_cost = $3, total_tax = 0
       WHERE id = $1`,
      [poId, totalItems, totalCost]
    );

    await client.query('COMMIT');
    return NextResponse.json({ id: poId, transactionId, totalItems, totalCost }, { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[purchase reorder POST]', err.message);
    return NextResponse.json({ error: err.message || 'Failed to generate purchase order' }, { status: 500 });
  } finally {
    client.release();
  }
}
