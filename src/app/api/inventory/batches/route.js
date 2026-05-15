import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureStockInSchema } from '@/lib/stockInSchema';

function barcodeFromId(id) {
  const numeric = String(id || 0).replace(/\D/g, '');
  return `84${numeric.padStart(10, '0').slice(-10)}`;
}

export async function GET() {
  try {
    await ensureStockInSchema();

    const res = await query(
      `SELECT
        s.id,
        s.transaction_id,
        s.created_at,
        s.confirmed_at,
        s.total_items,
        s.total_cost,
        s.other_charges,
        s.remarks,
        s.meta,
        COALESCE(SUM(si.qty), 0) AS item_qty_sum,
        COALESCE(SUM(si.qty * si.cost_price), 0) AS items_cost_sum
      FROM stock_in s
      LEFT JOIN stock_in_items si ON si.stock_in_id = s.id
      WHERE s.status = 'confirmed'
      GROUP BY s.id
      ORDER BY s.confirmed_at DESC NULLS LAST, s.created_at DESC
      LIMIT 200`
    );

    const rows = res.rows.map((row) => {
      const ts = row.confirmed_at || row.created_at;
      const totalItems = Number(row.total_items || row.item_qty_sum || 0);
      const totalCost = Number(row.total_cost || Number(row.items_cost_sum || 0) + Number(row.other_charges || 0));
      const meta = typeof row.meta === 'object' && row.meta ? row.meta : {};

      return {
        id: row.id,
        batchName: row.transaction_id ? `Batch-${row.transaction_id}` : `Batch-${String(row.id).padStart(4, '0')}`,
        barcode: barcodeFromId(row.id),
        timestamp: ts,
        cost: totalCost,
        items: totalItems,
        user: meta.created_by || 'System',
        remarks: row.remarks || 'Processed',
      };
    });

    return NextResponse.json(rows);
  } catch (err) {
    console.error('[inventory batches GET]', err.message);
    return NextResponse.json([]);
  }
}
