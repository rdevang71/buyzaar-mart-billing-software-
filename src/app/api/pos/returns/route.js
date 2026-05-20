import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { verifyToken } from '@/lib/auth-enhanced';

// Create return/exchange
export async function POST(req) {
  try {
    // Try to get token from Authorization header or cookies
    let token = req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // Try to get from cookies (for client-side requests)
      token = req.cookies.get('access_token')?.value ||
              req.cookies.get('auth_token')?.value ||
              req.cookies.get('token')?.value;
    }
    
    if (!token) return errorResponse('Unauthorized', 401);

    const user = verifyToken(token);
    if (!user) return errorResponse('Invalid token', 401);

    const body = await req.json();
    const {
      original_bill_id,
      return_type = 'return', // return, exchange
      reason,
      items = [],
      refund_amount = 0,
      store_id
    } = body;

    if (!original_bill_id || items.length === 0) {
      return errorResponse('Missing required fields', 400);
    }

    // Get original bill
    const billRes = await query(`
      SELECT * FROM sales_bills WHERE id = $1
    `, [original_bill_id]);

    if (!billRes.rows.length) {
      return errorResponse('Original bill not found', 404);
    }

    // Create return record
    const returnRes = await query(`
      INSERT INTO sales_returns (
        original_bill_id, return_type, reason, refund_amount, 
        created_by, status, store_id
      ) VALUES ($1, $2, $3, $4, $5, 'initiated', $6)
      RETURNING id
    `, [original_bill_id, return_type, reason, refund_amount, user.id, store_id]);

    const return_id = returnRes.rows[0]?.id;

    // Add returned items
    for (const item of items) {
      await query(`
        INSERT INTO sales_return_items (
          sales_return_id, product_id, qty, original_price
        ) VALUES ($1, $2, $3, $4)
      `, [return_id, item.product_id, item.qty, item.original_price]);

      // Restock items
      await query(`
        INSERT INTO stock_in (product_id, store_id, qty, batch_id, cost_price, reference_type, reference_id)
        VALUES ($1, $2, $3, NULL, $4, 'sales_return', $5)
      `, [item.product_id, store_id, item.qty, item.original_price, return_id]);
    }

    return successResponse({
      return_id,
      return_type,
      refund_amount,
      status: 'initiated'
    });
  } catch (err) {
    console.error('Return creation error:', err);
    return errorResponse(err.message);
  }
}

// Get returns list
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const bill_id = searchParams.get('bill_id');
    const store_id = searchParams.get('store_id');

    let query_str = `
      SELECT sr.*, sb.total_amount as original_amount, c.name as customer_name
      FROM sales_returns sr
      LEFT JOIN sales_bills sb ON sr.original_bill_id = sb.id
      LEFT JOIN customers c ON sb.customer_id = c.id
      WHERE 1=1
    `;

    const params = [];

    if (bill_id) {
      query_str += ` AND sr.original_bill_id = $${params.length + 1}`;
      params.push(bill_id);
    }

    if (store_id) {
      query_str += ` AND sr.store_id = $${params.length + 1}`;
      params.push(store_id);
    }

    query_str += ` ORDER BY sr.created_at DESC LIMIT 100`;

    const res = await query(query_str, params);

    return successResponse(res.rows || []);
  } catch (err) {
    return errorResponse(err.message);
  }
}
