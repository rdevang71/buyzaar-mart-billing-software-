import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { extractAuthUser } from '@/lib/api-protection';
import { ensureSalesReturnsSchema } from '@/lib/salesReturnsSchema';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isSuperAdmin(user) {
  return user?.role === 'super_admin' || (Array.isArray(user?.permissions) && user.permissions.includes('*'));
}

function isStoreAdmin(user, storeId) {
  return user?.role === 'admin' && (user.assigned_stores || []).map(Number).includes(Number(storeId));
}

function canReviewReturn(user, storeId) {
  return isSuperAdmin(user) || isStoreAdmin(user, storeId);
}

// Create return/exchange
export async function POST(req) {
  try {
    await ensureSalesReturnsSchema();

    const auth = await extractAuthUser(req);
    if (auth.error || !auth.user) return errorResponse(auth.error || 'Unauthorized', 401);
    const user = auth.user;

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

    const billLookup = String(original_bill_id).trim();
    const isNumericBillId = /^\d+$/.test(billLookup);
    const billRes = await query(
      isNumericBillId
        ? 'SELECT * FROM sales_bills WHERE id = $1'
        : 'SELECT * FROM sales_bills WHERE bill_number = $1',
      [billLookup]
    );

    if (!billRes.rows.length) {
      return errorResponse('Original bill not found', 404);
    }

    const bill = billRes.rows[0];
    const requestStoreId = Number(store_id || bill.store_id || 0) || null;
    const isGlobalAccess = isSuperAdmin(user);
    const assignedStores = (user.assigned_stores || []).map(Number);
    if (!isGlobalAccess && requestStoreId && !assignedStores.includes(requestStoreId)) {
      return errorResponse('You do not have access to this store', 403);
    }

    // Create approval request. Stock is updated only after admin/super admin approval.
    const returnRes = await query(`
      INSERT INTO sales_returns (
        original_bill_id, return_type, reason, refund_amount, 
        created_by, status, store_id
      ) VALUES ($1, $2, $3, $4, $5, 'pending', $6)
      RETURNING id
    `, [bill.id, return_type, reason, refund_amount, user.id, requestStoreId]);

    const return_id = returnRes.rows[0]?.id;

    // Add returned items
    for (const item of items) {
      await query(`
        INSERT INTO sales_return_items (
          sales_return_id, product_id, qty, original_price
        ) VALUES ($1, $2, $3, $4)
      `, [return_id, item.product_id, item.qty, item.original_price]);

    }

    return successResponse({
      return_id,
      return_type,
      refund_amount,
      status: 'pending'
    }, 'Return request sent for approval');
  } catch (err) {
    console.error('Return creation error:', err);
    return errorResponse(err.message);
  }
}

// Get returns list
export async function GET(req) {
  try {
    await ensureSalesReturnsSchema();

    const auth = await extractAuthUser(req);
    if (auth.error || !auth.user) return errorResponse(auth.error || 'Unauthorized', 401);

    const { searchParams } = new URL(req.url);
    const bill_id = searchParams.get('bill_id');
    const store_id = searchParams.get('store_id');
    const status = searchParams.get('status');
    const limit = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '100', 10), 1), 200);

    let query_str = `
      SELECT
        sr.*,
        sb.bill_number,
        sb.grand_total as original_amount,
        sb.customer_name,
        sb.customer_mobile,
        s.name as store_name,
        u.name as requested_by_name
      FROM sales_returns sr
      LEFT JOIN sales_bills sb ON sr.original_bill_id = sb.id
      LEFT JOIN stores s ON sr.store_id = s.id
      LEFT JOIN users u ON sr.created_by = u.id
      WHERE 1=1
    `;

    const params = [];
    const user = auth.user;

    if (!isSuperAdmin(user)) {
      const assignedStores = (user.assigned_stores || []).map(Number).filter(Number.isFinite);
      if (assignedStores.length === 0) return successResponse([]);
      params.push(assignedStores);
      query_str += ` AND sr.store_id = ANY($${params.length}::int[])`;
    }

    if (bill_id) {
      query_str += ` AND sr.original_bill_id = $${params.length + 1}`;
      params.push(bill_id);
    }

    if (store_id) {
      query_str += ` AND sr.store_id = $${params.length + 1}`;
      params.push(store_id);
    }

    if (status) {
      query_str += ` AND sr.status = $${params.length + 1}`;
      params.push(status);
    }

    params.push(limit);
    query_str += ` ORDER BY sr.created_at DESC LIMIT $${params.length}`;

    const res = await query(query_str, params);

    return successResponse(res.rows || []);
  } catch (err) {
    return errorResponse(err.message);
  }
}

export async function PATCH(req) {
  try {
    await ensureSalesReturnsSchema();

    const auth = await extractAuthUser(req);
    if (auth.error || !auth.user) return errorResponse(auth.error || 'Unauthorized', 401);

    const body = await req.json();
    const returnId = Number(body.return_id || body.id);
    const action = String(body.action || '').toLowerCase();
    const rejectionReason = body.rejection_reason || '';

    if (!returnId || !['approve', 'decline', 'reject'].includes(action)) {
      return errorResponse('Valid return_id and action are required', 400);
    }

    const returnRes = await query('SELECT * FROM sales_returns WHERE id = $1', [returnId]);
    const returnRow = returnRes.rows[0];
    if (!returnRow) return errorResponse('Return request not found', 404);
    if (returnRow.status !== 'pending') return errorResponse('This request is already reviewed', 400);
    if (!canReviewReturn(auth.user, returnRow.store_id)) {
      return errorResponse('Only this store admin or super admin can review this request', 403);
    }

    if (action === 'decline' || action === 'reject') {
      const declined = await query(
        `UPDATE sales_returns
         SET status = 'declined', rejected_by = $1, rejected_at = NOW(),
             rejection_reason = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [auth.user.id, rejectionReason, returnId]
      );
      return successResponse(declined.rows[0], 'Return request declined');
    }

    const itemsRes = await query(
      `SELECT sri.*, p.name AS product_name
       FROM sales_return_items sri
       LEFT JOIN products p ON p.id = sri.product_id
       WHERE sri.sales_return_id = $1`,
      [returnId]
    );

    const totalQty = itemsRes.rows.reduce((sum, item) => sum + toNumber(item.qty), 0);
    const totalCost = itemsRes.rows.reduce((sum, item) => sum + (toNumber(item.qty) * toNumber(item.original_price)), 0);

    const stockInRes = await query(
      `INSERT INTO stock_in (
        transaction_id, method, destination_id, apply_taxes, add_products_prefill,
        status, vendor_name, invoice_date, invoice_number, remarks,
        total_items, total_cost, total_tax, reference_type, reference_id,
        meta, created_at, confirmed_at
      ) VALUES (
        $1, 'sales_return', $2, true, false,
        'confirmed', 'Sales Return', CURRENT_DATE, $3, $4,
        $5, $6, 0, 'sales_return', $7,
        $8::jsonb, NOW(), NOW()
      ) RETURNING id`,
      [
        `RET-STKI-${returnId}`,
        returnRow.store_id,
        `RETURN-${returnId}`,
        `Approved ${returnRow.return_type} request`,
        totalQty,
        totalCost,
        String(returnId),
        JSON.stringify({ source: 'return-approval', approvedBy: auth.user.id }),
      ]
    );

    const stockInId = stockInRes.rows[0]?.id;
    for (const item of itemsRes.rows) {
      await query(
        `INSERT INTO stock_in_items (stock_in_id, product_id, product_name, qty, cost_price, tax_value, created_at)
         VALUES ($1, $2, $3, $4, $5, 0, NOW())`,
        [stockInId, item.product_id, item.product_name || 'Product', item.qty, item.original_price]
      );
    }

    const approved = await query(
      `UPDATE sales_returns
       SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [auth.user.id, returnId]
    );

    return successResponse(approved.rows[0], 'Return request approved');
  } catch (err) {
    console.error('Return review error:', err);
    return errorResponse(err.message);
  }
}
