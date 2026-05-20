import { query } from '@/lib/db';
import { successResponse, errorResponse, notFoundError } from '@/lib/api-response';
import { verifyToken } from '@/lib/auth-enhanced';
import { ensureSalesBillingSchema } from '@/lib/salesBillingSchema';

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
      store_id,
      customer_id,
      items = [],
      payment_mode,
      total_amount,
      total_tax,
      discount_amount = 0,
      round_off = 0,
      notes = '',
      invoice_number,
    } = body;

    if (!store_id || !items.length || !total_amount) {
      return errorResponse('Missing required fields', 400);
    }

    // Calculate totals
    let calculatedTotal = 0;
    let calculatedTax = 0;

    for (const item of items) {
      const itemTotal = item.qty * item.selling_price;
      calculatedTotal += itemTotal;
      if (item.tax_rate) {
        calculatedTax += (itemTotal * item.tax_rate) / 100;
      }
    }

    // Create sales bill
    const billRes = await query(`
      INSERT INTO sales_bills (
        store_id, customer_id, total_amount, total_tax, discount_amount, round_off,
        payment_mode, notes, created_by, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed'
      ) RETURNING id, created_at
    `, [
      store_id,
      customer_id || null,
      total_amount,
      total_tax || calculatedTax,
      discount_amount,
      round_off,
      payment_mode,
      notes,
      user.id
    ]);

    const bill_id = billRes.rows[0]?.id;

    // Insert bill items
    for (const item of items) {
      await query(`
        INSERT INTO sales_bill_items (
          sales_bill_id, product_id, qty, selling_price, tax_rate, cost_price
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        bill_id,
        item.product_id,
        item.qty,
        item.selling_price,
        item.tax_rate || 0,
        item.cost_price || 0
      ]);

      // Update stock out
      await query(`
        INSERT INTO stock_out (product_id, store_id, qty, reference_type, reference_id)
        VALUES ($1, $2, $3, 'sales_bill', $4)
      `, [item.product_id, store_id, item.qty, bill_id]);
    }

    // Generate invoice
    const invoiceRes = await query(`
      INSERT INTO invoice_sales_orders (sales_bill_id, invoice_number, status)
      VALUES ($1, $2, 'generated')
      RETURNING id, invoice_number
    `, [bill_id, invoice_number || `INV-${Date.now()}`]);

    return successResponse({
      bill_id,
      invoice_number: invoiceRes.rows[0]?.invoice_number,
      total_amount,
      total_tax: total_tax || calculatedTax,
      status: 'completed'
    });
  } catch (err) {
    console.error('POS billing error:', err);
    return errorResponse(err.message);
  }
}

// Get bill details
export async function GET(req) {
  try {
    await ensureSalesBillingSchema();

    const { searchParams } = new URL(req.url);
    const bill_id = searchParams.get('bill_id');

    if (!bill_id) return errorResponse('bill_id required', 400);

    const isNumericId = /^\d+$/.test(bill_id);
    const billRes = await query(
      isNumericId
        ? `SELECT * FROM sales_bills WHERE id = $1`
        : `SELECT * FROM sales_bills WHERE bill_number = $1`,
      [bill_id]
    );

    const bill = billRes.rows[0];
    if (!bill) {
      return notFoundError('Bill not found');
    }

    const itemsRes = await query(`
      SELECT
        sbi.*,
        COALESCE(sbi.product_name, p.name) AS name,
        COALESCE(sbi.sku, p.sku) AS sku
      FROM sales_bill_items sbi
      JOIN products p ON sbi.product_id = p.id
      WHERE sbi.sales_bill_id = $1
    `, [bill.id]);

    return successResponse({
      bill,
      items: itemsRes.rows || []
    });
  } catch (err) {
    return errorResponse(err.message);
  }
}
