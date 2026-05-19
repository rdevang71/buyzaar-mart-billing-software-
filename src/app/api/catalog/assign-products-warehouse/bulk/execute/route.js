import { getClient } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function POST(req) {
  let client;
  try {
    const body = await req.json();
    const productIds = body.productIds || [];
    const warehouseIds = body.warehouseIds || [];
    if (!productIds.length || !warehouseIds.length) {
      return errorResponse('productIds and warehouseIds required', 400);
    }

    client = await getClient();
    await client.query('BEGIN');

    let applied = 0;
    for (const pid of productIds) {
      for (const wid of warehouseIds) {
        await client.query(
          `INSERT INTO product_warehouses (product_id, warehouse_id, is_active, created_at, updated_at)
           VALUES ($1, $2, true, NOW(), NOW())
           ON CONFLICT (product_id, warehouse_id) DO UPDATE SET is_active = EXCLUDED.is_active, updated_at = NOW()`,
          [pid, wid]
        );
        applied++;
      }
    }

    await client.query('COMMIT');
    return successResponse({ applied }, 'Bulk assign to warehouses completed');
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(()=>{});
    console.error(err);
    return errorResponse('Bulk assign failed');
  } finally {
    if (client) client.release();
  }
}
