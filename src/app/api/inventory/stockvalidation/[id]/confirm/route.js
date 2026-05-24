import { NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { ensureStockValidationSchema } from '@/lib/stockValidationSchema';
import { allocateBatchStock, ensureInventoryBatchSchema, receiveBatchStock } from '@/lib/inventoryBatching';
import { requireAuth, requirePermission, requireStore } from '@/lib/api-protection';

export async function POST(request, { params }) {
  const { id } = await params;
  try {
    await ensureStockValidationSchema();
    await ensureInventoryBatchSchema();
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const permissionCheck = requirePermission(auth.user, 'MANAGE_INVENTORY');
    if (permissionCheck.error) return permissionCheck.error;

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
      if (qty <= 0) {
        return NextResponse.json({ error: 'Quantity must be greater than zero' }, { status: 400 });
      }
      totalItems += qty;
      totalCost += qty * cost;
      totalTax += tax * qty;
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');
      const draft = await client.query('SELECT id, status, destination_id FROM stock_validation WHERE id = $1', [id]);
      if (draft.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Stock validation not found' }, { status: 404 });
      }
      if (draft.rows[0].status === 'confirmed') {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Already confirmed' }, { status: 409 });
      }
      const storeCheck = requireStore(auth.user, draft.rows[0].destination_id);
      if (storeCheck.error) {
        await client.query('ROLLBACK');
        return storeCheck.error;
      }

      await client.query('DELETE FROM stock_validation_items WHERE stock_validation_id = $1', [id]);
      for (const item of items) {
        const productId = Number(item.product_id);
        const countedQty = Number(item.qty || 0);
        const productName = item.name || item.product_name || `Product ${productId}`;
        await client.query(
          `INSERT INTO stock_validation_items (
            stock_validation_id, product_id, product_name, qty, cost_price, tax_value, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [id, productId, productName, countedQty, item.cost_price || 0, item.tax_value || 0]
        );

        const stockRes = await client.query(
          `SELECT COALESCE(SUM(available_qty), 0) AS qty
           FROM inventory_batches
           WHERE product_id = $1
             AND store_id = $2
             AND status = 'active'`,
          [productId, draft.rows[0].destination_id]
        );
        const currentQty = Number(stockRes.rows[0]?.qty || 0);
        const variance = Math.round((countedQty - currentQty) * 1000) / 1000;

        if (variance > 0) {
          await receiveBatchStock(client, {
            stockInId: id,
            productId,
            storeId: draft.rows[0].destination_id,
            qty: variance,
            costPrice: Number(item.cost_price || 0),
            batchNo: `AUD-${id}-${productId}`,
            meta: {
              source: 'stock_validation',
              validationId: id,
              productName,
              countedQty,
              previousQty: currentQty,
              variance,
            },
          });
        } else if (variance < 0) {
          await allocateBatchStock(client, {
            productId,
            storeId: draft.rows[0].destination_id,
            qty: Math.abs(variance),
            referenceType: 'stock_validation',
            referenceId: id,
            meta: {
              source: 'stock_validation',
              validationId: id,
              productName,
              countedQty,
              previousQty: currentQty,
              variance,
            },
          });
        }
      }

      await client.query(
        `UPDATE stock_validation SET
          status = 'confirmed',
          invoice_date = $1,
          invoice_number = $2,
          other_charges = $3,
          remarks = $4,
          total_items = $5,
          total_cost = $6,
          total_tax = $7,
          meta = meta || $8::jsonb,
          confirmed_at = NOW()
        WHERE id = $9`,
        [
          form.invoice_date || null,
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
    console.error('[stockvalidation confirm]', err.message);
    return NextResponse.json({ error: 'Failed to confirm stock validation' }, { status: 500 });
  }
}
