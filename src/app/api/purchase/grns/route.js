import { NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { ensureStockInSchema } from '@/lib/stockInSchema';

export async function GET() {
  try {
    await ensureStockInSchema();
    const res = await query(
      `SELECT
        s.id,
        s.transaction_id,
        s.invoice_number,
        s.invoice_date,
        s.vendor_name,
        s.other_charges,
        s.total_items,
        s.total_cost,
        s.total_tax,
        s.reference_type,
        s.reference_id,
        s.status,
        s.created_at,
        st.name AS destination_name,
        COALESCE(SUM(si.qty), 0) AS item_qty_sum,
        COALESCE(SUM(si.qty * si.cost_price), 0) AS items_cost_sum
      FROM stock_in s
      LEFT JOIN stores st ON st.id = s.destination_id
      LEFT JOIN stock_in_items si ON si.stock_in_id = s.id
      WHERE s.reference_type = 'purchase_order'
      GROUP BY s.id, st.name
      ORDER BY s.confirmed_at DESC NULLS LAST, s.created_at DESC
      LIMIT 200`
    );

    const records = res.rows.map((row) => {
      const totalItems = Number(row.total_items || row.item_qty_sum || 0);
      const totalCost = Number(row.total_cost || Number(row.items_cost_sum || 0) + Number(row.other_charges || 0));
      return {
        id: row.id,
        transactionId: row.transaction_id || `#STK-${String(row.id).padStart(3, '0')}`,
        invoiceNumber: row.invoice_number || '—',
        destination: row.destination_name || '—',
        invoiceDate: row.invoice_date,
        totalItems,
        cost: totalCost,
        referenceType: row.reference_type || '—',
        referenceId: row.reference_id || '—',
        vendorName: row.vendor_name,
        totalTax: Number(row.total_tax || 0),
        createdAt: row.created_at,
      };
    });

    return NextResponse.json(records);
  } catch (err) {
    console.error('[grns GET]', err.message);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request) {
  try {
    await ensureStockInSchema();
    const payload = await request.json();
    const client = await getClient();
    try {
      await client.query('BEGIN');
      // create a stock_in record referencing the purchase order
      const insertText = `
        INSERT INTO stock_in (method, destination_id, apply_taxes, add_products_prefill, meta, status, reference_type, reference_id, vendor_name, invoice_number, invoice_date, created_at)
        VALUES ($1, $2, $3, $4, $5, 'draft', 'purchase_order', $6, $7, $8, $9, NOW())
        RETURNING id`;
      const values = [
        'purchase_order',
        payload.destination || null,
        payload.applyTaxes ?? true,
        payload.addProductsPrefill ?? false,
        JSON.stringify(payload),
        payload.poId || null,
        payload.vendorName || null,
        payload.invoiceNumber || null,
        payload.invoiceDate || null,
      ];
      const res = await client.query(insertText, values);
      const id = res.rows[0].id;
      const transactionId = `GRN-${String(id).padStart(4, '0')}`;
      await client.query('UPDATE stock_in SET transaction_id = $1 WHERE id = $2', [transactionId, id]);

      // optionally insert line items if provided
      if (Array.isArray(payload.items) && payload.items.length) {
        const insertItemText = `INSERT INTO stock_in_items (stock_in_id, product_id, product_name, qty, cost_price, tax_value) VALUES ($1, $2, $3, $4, $5, $6)`;
        for (const it of payload.items) {
          await client.query(insertItemText, [id, it.product_id, it.product_name || null, it.qty || 0, it.cost_price || 0, it.tax_value || 0]);
        }
      }

      await client.query('COMMIT');
      return NextResponse.json({ id, transactionId }, { status: 201 });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[grns POST]', err.message);
    return NextResponse.json({ error: 'Failed to create GRN' }, { status: 500 });
  }
}
