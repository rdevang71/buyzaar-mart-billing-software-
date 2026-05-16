import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureStockValidationSchema } from '@/lib/stockValidationSchema';

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    await ensureStockValidationSchema();
    const res = await query(
      `SELECT
        sv.id,
        sv.destination_id,
        sv.apply_taxes,
        sv.status,
        sv.invoice_number,
        sv.invoice_date,
        sv.other_charges,
        sv.remarks,
        sv.meta,
        stores.name AS destination_name
      FROM stock_validation sv
      LEFT JOIN stores ON stores.id = sv.destination_id
      WHERE sv.id = $1`,
      [id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const row = res.rows[0];
    const meta = typeof row.meta === 'object' ? row.meta : {};
    return NextResponse.json({
      id: row.id,
      destination: row.destination_id || meta.destination || 'none',
      destinationName: row.destination_name || 'None',
      applyTaxes: row.apply_taxes,
      status: row.status || 'draft',
      invoice_number: row.invoice_number || '',
      invoice_date: row.invoice_date ? String(row.invoice_date).slice(0, 10) : '',
      other_charges: row.other_charges ?? '',
      remarks: row.remarks || '',
      meta,
    });
  } catch (err) {
    console.error('[stockvalidation GET id]', err.message);
    return NextResponse.json({ error: 'Failed to load stock validation' }, { status: 500 });
  }
}
