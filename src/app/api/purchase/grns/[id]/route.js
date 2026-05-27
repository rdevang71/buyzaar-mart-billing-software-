import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureStockInSchema } from '@/lib/stockInSchema';
import { requireAuth, requirePermission, requireStore } from '@/lib/api-protection';

export async function GET(request, { params }) {
  try {
    await ensureStockInSchema();
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const permissionCheck = requirePermission(auth.user, 'MANAGE_PURCHASE_ORDERS', 'MANAGE_VENDORS');
    if (permissionCheck.error) return permissionCheck.error;
    const id = params?.id || null;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const res = await query(
      `SELECT s.*, st.name AS destination_name, COALESCE(json_agg(json_build_object('id', si.id, 'product_id', si.product_id, 'product_name', si.product_name, 'qty', si.qty, 'cost_price', si.cost_price, 'tax_value', si.tax_value)) FILTER (WHERE si.id IS NOT NULL), '[]') AS items
       FROM stock_in s
       LEFT JOIN stores st ON st.id = s.destination_id
       LEFT JOIN stock_in_items si ON si.stock_in_id = s.id
       WHERE s.id = $1 AND s.reference_type = 'purchase_order'
       GROUP BY s.id, st.name`,
      [id]
    );

    if (!res.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const row = res.rows[0];
    const storeCheck = requireStore(auth.user, row.destination_id);
    if (storeCheck.error) return storeCheck.error;
    return NextResponse.json({ ...row, items: row.items });
  } catch (err) {
    console.error('[grns [id] GET]', err.message);
    return NextResponse.json({ error: 'Failed to fetch GRN' }, { status: 500 });
  }
}
