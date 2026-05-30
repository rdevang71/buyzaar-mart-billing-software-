import { NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
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

export async function PUT(request, { params }) {
  try {
    await ensureStockInSchema();
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const permissionCheck = requirePermission(auth.user, 'MANAGE_PURCHASE_ORDERS');
    if (permissionCheck.error) return permissionCheck.error;

    const id = params?.id || null;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const body = await request.json();
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const res = await client.query('SELECT id, status, destination_id FROM stock_in WHERE id = $1 FOR UPDATE', [id]);
      if (!res.rows.length) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      const existing = res.rows[0];
      if (String(existing.status || '').toLowerCase() !== 'draft') {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Only draft GRNs can be edited' }, { status: 409 });
      }

      const destinationId = body.destination || existing.destination_id || null;
      const storeCheck = requireStore(auth.user, destinationId);
      if (storeCheck.error) {
        await client.query('ROLLBACK');
        return storeCheck.error;
      }

      const vendorId = body.vendorId || body.vendor || null;
      const vendorName = body.vendorName || null;
      const invoiceNumber = body.invoiceNumber || body.invoice_number || null;
      const invoiceDate = body.invoiceDate || body.invoice_date || null;

      await client.query(
        `UPDATE stock_in SET destination_id = $1, vendor_id = $2, vendor_name = $3, invoice_number = $4, invoice_date = $5, meta = COALESCE(meta, '{}'::jsonb) || $6::jsonb WHERE id = $7`,
        [destinationId, vendorId, vendorName, invoiceNumber, invoiceDate || null, JSON.stringify(body.meta || {}), id]
      );

      // Replace line items if provided
      if (Array.isArray(body.items)) {
        await client.query('DELETE FROM stock_in_items WHERE stock_in_id = $1', [id]);
        const insertItemText = `INSERT INTO stock_in_items (stock_in_id, product_id, product_name, qty, cost_price, tax_value) VALUES ($1, $2, $3, $4, $5, $6)`;
        for (const it of body.items) {
          await client.query(insertItemText, [id, it.product_id, it.product_name || null, it.qty || 0, it.cost_price || 0, it.tax_value || 0]);
        }
      }

      await client.query('COMMIT');
      return NextResponse.json({ ok: true, id }, { status: 200 });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[grns [id] PUT]', err.message);
    return NextResponse.json({ error: err.message || 'Failed to update GRN' }, { status: 500 });
  }
}
