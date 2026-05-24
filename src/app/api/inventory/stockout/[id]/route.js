import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureStockOutSchema } from '@/lib/stockOutSchema';
import { requireAuth, requirePermission, requireStore } from '@/lib/api-protection';

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    await ensureStockOutSchema();
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const permissionCheck = requirePermission(auth.user, 'VIEW_INVENTORY', 'MANAGE_INVENTORY');
    if (permissionCheck.error) return permissionCheck.error;

    const res = await query(
      `SELECT s.id, s.method, s.destination_id, s.meta, s.status, s.created_at,
              s.purchase_order_id, s.vendor_name, s.invoice_number, s.invoice_date,
              s.other_charges, s.remarks,
              s.apply_taxes, s.add_products_prefill, st.name AS destination_name
       FROM stock_out s
       LEFT JOIN stores st ON st.id = s.destination_id
       WHERE s.id = $1`,
      [id]
    );
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const row = res.rows[0];
    const storeCheck = requireStore(auth.user, row.destination_id);
    if (storeCheck.error) return storeCheck.error;

    const meta = typeof row.meta === 'object' ? row.meta : {};
    return NextResponse.json({
      id: row.id,
      method: row.method,
      destination: row.destination_id,
      destinationName: row.destination_name || 'All',
      status: row.status || 'draft',
      applyTaxes: row.apply_taxes,
      addProductsPrefill: row.add_products_prefill,
      purchase_order_id: row.purchase_order_id || meta.purchaseOrderId || '',
      vendor_name: row.vendor_name || meta.vendor || '',
      invoice_number: row.invoice_number || meta.invoiceNumber || '',
      invoice_date: row.invoice_date ? String(row.invoice_date).slice(0, 10) : '',
      other_charges: row.other_charges ?? meta.other_charges ?? '',
      remarks: row.remarks || meta.remarks || '',
      meta,
    });
  } catch (err) {
    console.error('[stockout GET id]', err.message);
    return NextResponse.json({ error: 'Failed to load stock out' }, { status: 500 });
  }
}
