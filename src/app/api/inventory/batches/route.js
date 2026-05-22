import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureStockInSchema } from '@/lib/stockInSchema';
import { ensureInventoryBatchSchema } from '@/lib/inventoryBatching';

function barcodeFromId(id) {
  const numeric = String(id || 0).replace(/\D/g, '');
  return `84${numeric.padStart(10, '0').slice(-10)}`;
}

export async function GET() {
  try {
    await ensureStockInSchema();
    await ensureInventoryBatchSchema();

    const res = await query(
      `SELECT
        ib.id,
        ib.batch_no,
        ib.mfg_date,
        ib.expiry_date,
        ib.received_qty,
        ib.available_qty,
        ib.cost_price,
        ib.status,
        ib.source_type,
        ib.source_id,
        ib.created_at,
        p.name AS product_name,
        p.sku,
        s.name AS store_name
      FROM inventory_batches ib
      LEFT JOIN products p ON p.id = ib.product_id
      LEFT JOIN stores s ON s.id = ib.store_id
      ORDER BY ib.expiry_date ASC NULLS LAST, ib.created_at DESC
      LIMIT 200`
    );

    const rows = res.rows.map((row) => {
      return {
        id: row.id,
        batchName: row.batch_no || `Batch-${String(row.id).padStart(4, '0')}`,
        barcode: barcodeFromId(row.id),
        timestamp: row.created_at,
        cost: Number(row.available_qty || 0) * Number(row.cost_price || 0),
        items: Number(row.available_qty || 0),
        receivedItems: Number(row.received_qty || 0),
        product: row.product_name || 'Product',
        sku: row.sku || '',
        store: row.store_name || '',
        expiryDate: row.expiry_date,
        mfgDate: row.mfg_date,
        status: row.status,
        user: row.source_type || 'System',
        remarks: row.expiry_date ? `Expires ${new Date(row.expiry_date).toLocaleDateString('en-IN')}` : 'No expiry',
      };
    });

    return NextResponse.json(rows);
  } catch (err) {
    console.error('[inventory batches GET]', err.message);
    return NextResponse.json([]);
  }
}
