import { NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { ensureStockOutSchema } from '@/lib/stockOutSchema';

export async function GET() {
  try {
    await ensureStockOutSchema();
    const res = await query(
      `SELECT
        s.id,
        s.transaction_id,
        s.invoice_number,
        s.invoice_date,
        s.purchase_order_id,
        s.vendor_name,
        s.other_charges,
        s.method,
        s.total_items,
        s.total_cost,
        s.total_tax,
        s.reference_type,
        s.reference_id,
        s.status,
        s.created_at,
        st.name AS destination_name,
        COALESCE(SUM(soi.qty), 0) AS item_qty_sum,
        COALESCE(SUM(soi.qty * soi.cost_price), 0) AS items_cost_sum
      FROM stock_out s
      LEFT JOIN stores st ON st.id = s.destination_id
      LEFT JOIN stock_out_items soi ON soi.stock_out_id = s.id
      WHERE s.status = 'confirmed'
      GROUP BY s.id, st.name
      ORDER BY s.confirmed_at DESC NULLS LAST, s.created_at DESC
      LIMIT 200`
    );

    const records = res.rows.map((row) => {
      const totalItems = Number(row.total_items || row.item_qty_sum || 0);
      const totalCost = Number(row.total_cost || Number(row.items_cost_sum || 0) + Number(row.other_charges || 0));
      const refType =
        row.reference_type ||
        (row.method === 'po_return' ? 'PO Return' : 'Stock Out');
      const refId =
        row.reference_id ||
        row.purchase_order_id ||
        (row.method === 'po_return' ? row.invoice_number : null) ||
        '—';

      return {
        id: row.id,
        transactionId: row.transaction_id || `STKO-${String(row.id).padStart(4, '0')}`,
        invoiceNumber: row.invoice_number || '—',
        destination: row.destination_name || 'All',
        invoiceDate: row.invoice_date,
        totalItems,
        cost: totalCost,
        referenceType: refType,
        referenceId: refId,
        vendorName: row.vendor_name,
        totalTax: Number(row.total_tax || 0),
        method: row.method,
        createdAt: row.created_at,
      };
    });

    return NextResponse.json(records);
  } catch (err) {
    console.error('[stockout GET]', err.message);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request) {
  try {
    await ensureStockOutSchema();
    const payload = await request.json();
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const destinationId =
        payload.destination && payload.destination !== 'all'
          ? Number(payload.destination)
          : null;

      const res = await client.query(
        `INSERT INTO stock_out (
          method, destination_id, apply_taxes, add_products_prefill,
          purchase_order_id, invoice_number, reference_type, reference_id,
          meta, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', NOW())
        RETURNING id`,
        [
          payload.method || 'stock_out',
          destinationId,
          payload.applyTaxes ?? true,
          payload.addProductsPrefill ?? false,
          payload.purchaseOrderId || null,
          payload.invoiceNumber || null,
          payload.method === 'po_return' ? 'PO Return' : 'Stock Out',
          payload.purchaseOrderId || payload.invoiceNumber || null,
          JSON.stringify(payload),
        ]
      );
      const id = res.rows[0].id;
      const transactionId = `STKO-${String(id).padStart(4, '0')}`;
      await client.query('UPDATE stock_out SET transaction_id = $1 WHERE id = $2', [
        transactionId,
        id,
      ]);
      await client.query('COMMIT');
      return NextResponse.json({ id, transactionId }, { status: 201 });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[stockout POST]', err.message);
    return NextResponse.json({ error: 'Failed to create stock out' }, { status: 500 });
  }
}
