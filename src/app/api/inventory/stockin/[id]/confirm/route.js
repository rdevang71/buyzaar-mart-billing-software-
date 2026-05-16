import { NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { ensureStockInSchema } from '@/lib/stockInSchema';

export async function POST(request, { params }) {
  const { id } = await params;
  try {
    await ensureStockInSchema();
    const body = await request.json();
    const form = body.form || {};
    const items = body.items || [];

    if (!items.length) {
      return NextResponse.json({ error: 'Add at least one product' }, { status: 400 });
    }

    let totalItems = 0;
    let totalCost = Number(form.other_charges || 0);
    let totalTax = 0;

    for (const item of items) {
      const qty = Number(item.qty || 0);
      const cost = Number(item.cost_price || 0);
      const tax = Number(item.tax_value || 0);
      totalItems += qty;
      totalCost += qty * cost;
      totalTax += tax;
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const draft = await client.query('SELECT id, status FROM stock_in WHERE id = $1', [id]);
      if (draft.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Stock in not found' }, { status: 404 });
      }
      if (draft.rows[0].status === 'confirmed') {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Already confirmed' }, { status: 409 });
      }

      await client.query('DELETE FROM stock_in_items WHERE stock_in_id = $1', [id]);

      for (const item of items) {
        await client.query(
          `INSERT INTO stock_in_items (stock_in_id, product_id, product_name, qty, cost_price, tax_value, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [id, item.product_id, item.name || null, item.qty, item.cost_price || 0, item.tax_value || 0]
        );
      }

      const invoiceDate = form.invoice_date || null;
      await client.query(
        `UPDATE stock_in SET
          status = 'confirmed',
          vendor_name = $1,
          invoice_date = $2,
          invoice_number = $3,
          other_charges = $4,
          remarks = $5,
          total_items = $6,
          total_cost = $7,
          total_tax = $8,
          meta = meta || $9::jsonb,
          confirmed_at = NOW()
        WHERE id = $10`,
        [
          form.vendor || null,
          invoiceDate || null,
          form.invoice_number || null,
          Number(form.other_charges || 0),
          form.remarks || null,
          totalItems,
          totalCost,
          totalTax,
          JSON.stringify(form),
          id,
        ]
      );

      await client.query('COMMIT');
      return NextResponse.json({ success: true, id, totalItems, totalCost, totalTax });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[stockin confirm]', err.message);
    return NextResponse.json({ error: 'Failed to confirm stock in' }, { status: 500 });
  }
}
