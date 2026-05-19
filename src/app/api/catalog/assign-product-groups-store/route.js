import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) return errorResponse('storeId is required', 400);

    const res = await query(
      `SELECT pg.id, pg.name, pg.description,
              CASE WHEN pgs.store_id IS NOT NULL THEN true ELSE false END AS is_assigned
       FROM product_groups pg
       LEFT JOIN product_group_stores pgs ON pgs.product_group_id = pg.id AND pgs.store_id = $1
       ORDER BY pg.id DESC`,
      [storeId]
    );

    return successResponse({ records: res.rows }, 'Groups fetched');
  } catch (err) {
    console.error(err);
    return errorResponse('Failed to fetch groups');
  }
}
