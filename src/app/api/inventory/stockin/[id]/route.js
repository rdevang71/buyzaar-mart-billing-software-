import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureStockInSchema } from '@/lib/stockInSchema';
import { requireAuth, requirePermission, requireStore } from '@/lib/api-protection';

function normalizeDate(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    await ensureStockInSchema();
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const permissionCheck = requirePermission(auth.user, 'VIEW_INVENTORY', 'MANAGE_INVENTORY');
    if (permissionCheck.error) return permissionCheck.error;

    const res = await query(
      `SELECT s.id, s.method, s.destination_id, s.meta, s.status, s.created_at,
              s.vendor_name, s.invoice_date, s.invoice_number, s.other_charges, s.remarks,
              s.apply_taxes, st.name AS destination_name, st.meta AS destination_meta
       FROM stock_in s
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
    const destinationMeta = typeof row.destination_meta === 'object' ? row.destination_meta : {};
    const itemsRes = await query(
      `SELECT sii.id, sii.product_id, COALESCE(sii.product_name, p.name) AS product_name,
              p.sku, sii.qty, sii.cost_price, sii.tax_value, sii.batch_no, sii.mfg_date, sii.expiry_date
       FROM stock_in_items sii
       LEFT JOIN products p ON p.id = sii.product_id
       WHERE sii.stock_in_id = $1
       ORDER BY sii.id`,
      [id]
    );

    return NextResponse.json({
      id: row.id,
      method: row.method,
      destination: row.destination_id,
      destinationName: row.destination_name,
      destinationLocationType: destinationMeta.locationType || 'Warehouse',
      status: row.status || 'draft',
      applyTaxes: row.apply_taxes,
      meta,
      vendor_name: row.vendor_name || meta.vendor || '',
      invoice_date: normalizeDate(row.invoice_date) || normalizeDate(meta.invoice_date),
      invoice_number: row.invoice_number || meta.invoice_number || '',
      other_charges: row.other_charges ?? meta.other_charges ?? '',
      remarks: row.remarks || meta.remarks || '',
      items: itemsRes.rows.map((item) => ({
        id: item.id,
        product_id: item.product_id,
        name: item.product_name,
        sku: item.sku,
        qty: Number(item.qty || 0),
        cost_price: Number(item.cost_price || 0),
        tax_value: Number(item.tax_value || 0),
        batch_no: item.batch_no || '',
        mfg_date: normalizeDate(item.mfg_date),
        expiry_date: normalizeDate(item.expiry_date),
      })),
    });
  } catch (err) {
    console.error('[stockin GET id]', err.message);
    return NextResponse.json({ error: 'Failed to load stock in' }, { status: 500 });
  }
}
