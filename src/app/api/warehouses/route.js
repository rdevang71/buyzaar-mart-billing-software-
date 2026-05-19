import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function GET() {
  try {
    // For now warehouses are represented via the `stores` table; return all stores
    const res = await query('SELECT id, name FROM stores ORDER BY name');
    return successResponse({ records: res.rows }, 'Warehouses fetched');
  } catch (err) {
    console.error(err);
    return errorResponse('Failed to fetch warehouses');
  }
}
