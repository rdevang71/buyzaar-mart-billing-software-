import { NextResponse } from 'next/server';
import { getClient, query } from '@/lib/db';
import { ensureStockInSchema } from '@/lib/stockInSchema';
import { ensureInventoryBatchSchema, receiveBatchStock } from '@/lib/inventoryBatching';

export async function POST(request, { params }) {
  const { id } = await params;
    try {
      await ensureStockInSchema();
      await ensureInventoryBatchSchema();
      const body = await request.json();
    const form  = body.form  || {};
    const items = body.items || [];

    if (!items.length) {
      return NextResponse.json({ error: 'Add at least one product' }, { status: 400 });
    }

    // ── 1. Validate every product_id exists in the catalog ───────────────────
    const productIds = [...new Set(items.map((it) => Number(it.product_id)).filter(Boolean))];

    const catalogRes = await query(
      `SELECT id, name, cost_price, unit FROM products WHERE id = ANY($1::int[])`,
      [productIds]
    );
    const catalogMap = Object.fromEntries(catalogRes.rows.map((r) => [r.id, r]));

    const missing = productIds.filter((pid) => !catalogMap[pid]);
    if (missing.length) {
      return NextResponse.json(
        { error: `Products not found in catalog: IDs ${missing.join(', ')}` },
        { status: 422 }
      );
    }

    // ── 2. Fetch destination store (needed for product_saleability upsert) ───
    const stockInRow = await query(
      `SELECT id, status, destination_id FROM stock_in WHERE id = $1`,
      [id]
    );
    if (!stockInRow.rows.length) {
      return NextResponse.json({ error: 'Stock in not found' }, { status: 404 });
    }
    if (stockInRow.rows[0].status === 'confirmed') {
      return NextResponse.json({ error: 'Already confirmed' }, { status: 409 });
    }
    const destinationId = stockInRow.rows[0].destination_id;

    // ── 3. Compute totals ─────────────────────────────────────────────────────
    let totalItems = 0;
    let totalCost  = Number(form.other_charges || 0);
    let totalTax   = 0;
    for (const item of items) {
      const qty  = Number(item.qty        || 0);
      const cost = Number(item.cost_price || 0);
      const tax  = Number(item.tax_value  || 0);
      totalItems += qty;
      totalCost  += qty * cost;
      totalTax   += tax;
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // ── 4. Replace line items — use catalog name as source of truth ─────────
      await client.query('DELETE FROM stock_in_items WHERE stock_in_id = $1', [id]);

      for (const item of items) {
        const pid          = Number(item.product_id);
        const catalogEntry = catalogMap[pid];
        // Always store the canonical name from the catalog
        const productName  = catalogEntry.name;
        const qty          = Number(item.qty        || 1);
        const costPrice    = Number(item.cost_price || 0);
        const taxValue     = Number(item.tax_value  || 0);

        const stockInItemRes = await client.query(
          `INSERT INTO stock_in_items
             (stock_in_id, product_id, product_name, qty, cost_price, tax_value, batch_no, mfg_date, expiry_date, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
           RETURNING id`,
          [
            id,
            pid,
            productName,
            qty,
            costPrice,
            taxValue,
            item.batch_no || item.batchNo || null,
            item.mfg_date || item.mfgDate || null,
            item.expiry_date || item.expiryDate || null,
          ]
        );

        await receiveBatchStock(client, {
          stockInId: id,
          stockInItemId: stockInItemRes.rows[0]?.id,
          productId: pid,
          storeId: destinationId,
          qty,
          costPrice,
          batchNo: item.batch_no || item.batchNo,
          mfgDate: item.mfg_date || item.mfgDate,
          expiryDate: item.expiry_date || item.expiryDate,
          meta: { productName, invoiceNumber: form.invoice_number || null },
        });

        // ── 5. Update products.cost_price if the GRN cost differs ─────────────
        //    Only update when the incoming cost is > 0 so zeroed-out entries
        //    don't wipe a previously set cost.
        if (costPrice > 0) {
          await client.query(
            `UPDATE products SET cost_price = $1, updated_at = NOW() WHERE id = $2`,
            [costPrice, pid]
          );
        }

        // ── 6. Upsert product_saleability so product is active at this store ──
        //    - If the row doesn't exist yet, create it (selling_price/mrp default 0
        //      and should be set by the catalog manager separately).
        //    - If it exists, just make sure is_active = true and touch updated_at.
        if (destinationId) {
          await client.query(
            `INSERT INTO product_saleability
               (product_id, store_id, is_active, selling_price, mrp, low_stock_value, created_at, updated_at)
             VALUES ($1, $2, true, 0, 0, 0, NOW(), NOW())
             ON CONFLICT (product_id, store_id)
             DO UPDATE SET
               is_active  = true,
               updated_at = NOW()`,
            [pid, destinationId]
          );
        }
      }

      // ── 7. Mark stock_in as confirmed ────────────────────────────────────────
      await client.query(
        `UPDATE stock_in SET
           status         = 'confirmed',
           vendor_name    = $1,
           invoice_date   = $2,
           invoice_number = $3,
           other_charges  = $4,
           remarks        = $5,
           total_items    = $6,
           total_cost     = $7,
           total_tax      = $8,
           meta           = meta || $9::jsonb,
           confirmed_at   = NOW()
         WHERE id = $10`,
        [
          form.vendor        || null,
          form.invoice_date  || null,
          form.invoice_number|| null,
          Number(form.other_charges || 0),
          form.remarks       || null,
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
    return NextResponse.json({ error: err.message || 'Failed to confirm stock in' }, { status: 500 });
  }
}
