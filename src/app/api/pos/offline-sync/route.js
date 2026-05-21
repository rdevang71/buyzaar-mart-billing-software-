import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';

// Store offline bills in browser's localStorage, sync when online
export async function POST(req) {
  try {
    const body = await req.json();
    const { offline_bills = [] } = body;

    if (!Array.isArray(offline_bills) || offline_bills.length === 0) {
      return errorResponse('No offline bills to sync', 400);
    }

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return errorResponse('Unauthorized', 401);

    let syncedCount = 0;
    const errors = [];

    for (const bill of offline_bills) {
      try {
        // Create sales bill
        const billRes = await query(`
          INSERT INTO sales_bills (
            store_id, customer_id, total_amount, total_tax, discount_amount, round_off,
            payment_mode, notes, user_id, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed')
          RETURNING id, created_at
        `, [
          bill.store_id,
          bill.customer_id || null,
          bill.total_amount,
          bill.total_tax || 0,
          bill.discount_amount || 0,
          bill.round_off || 0,
          bill.payment_mode,
          bill.notes || '',
          bill.user_id || bill.created_by || null
        ]);

        const bill_id = billRes.rows[0]?.id;

        // Insert bill items
        for (const item of bill.items || []) {
          await query(`
            INSERT INTO sales_bill_items (
              sales_bill_id, product_id, qty, selling_price, tax_rate, cost_price
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [bill_id, item.product_id, item.qty, item.selling_price, item.tax_rate || 0, item.cost_price || 0]);

          // Update stock
          await query(`
            INSERT INTO stock_out (product_id, store_id, qty, reference_type, reference_id)
            VALUES ($1, $2, $3, 'sales_bill', $4)
          `, [item.product_id, bill.store_id, item.qty, bill_id]);
        }

        syncedCount++;
      } catch (err) {
        errors.push(`Bill sync error: ${err.message}`);
      }
    }

    return successResponse({
      synced_count: syncedCount,
      total_bills: offline_bills.length,
      errors: errors.length > 0 ? errors : null
    });
  } catch (err) {
    return errorResponse(err.message);
  }
}

// Get bills awaiting sync (client-side data)
export async function GET(req) {
  try {
    // This is a client-side operation, return client instructions
    return successResponse({
      offline_sync_enabled: true,
      storage_key: 'pending_offline_bills',
      instructions: 'Use browser localStorage to store pending bills when offline, sync when connection restored'
    });
  } catch (err) {
    return errorResponse(err.message);
  }
}
