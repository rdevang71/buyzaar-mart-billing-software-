import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureStockInSchema } from '@/lib/stockInSchema';

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    await ensureStockInSchema();
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
    const meta = typeof row.meta === 'object' ? row.meta : {};
    const destinationMeta = typeof row.destination_meta === 'object' ? row.destination_meta : {};
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
      invoice_date: row.invoice_date ? String(row.invoice_date).slice(0, 10) : meta.invoice_date || '',
      invoice_number: row.invoice_number || meta.invoice_number || '',
      other_charges: row.other_charges ?? meta.other_charges ?? '',
      remarks: row.remarks || meta.remarks || '',
    });
  } catch (err) {
    console.error('[stockin GET id]', err.message);
    return NextResponse.json({ error: 'Failed to load stock in' }, { status: 500 });
  }
}
