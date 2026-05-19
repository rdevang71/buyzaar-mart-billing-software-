import { getClient, query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function POST(req) {
  let client;
  try {
    const body = await req.json();
    const productIds = body.productIds || [];
    const storeIds = body.storeIds || [];
    if (!productIds.length || !storeIds.length) {
      return errorResponse('productIds and storeIds required', 400);
    }

    client = await getClient();
    await client.query('BEGIN');

    let applied = 0;
    for (const pid of productIds) {
      for (const sid of storeIds) {
        await client.query(
          `INSERT INTO product_saleability (product_id, store_id, is_active, created_at, updated_at)
           VALUES ($1, $2, true, NOW(), NOW())
           ON CONFLICT (product_id, store_id) DO UPDATE SET is_active = EXCLUDED.is_active, updated_at = NOW()`,
          [pid, sid]
        );
        applied++;
      }
    }

    await client.query('COMMIT');
    return successResponse({ applied }, 'Bulk assign completed');
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(()=>{});
    console.error(err);
    return errorResponse('Bulk assign failed');
  } finally {
    if (client) client.release();
  }
}
