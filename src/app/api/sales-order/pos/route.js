import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { verifyToken } from '@/lib/auth-enhanced';

// ============================================================================
// CREATE BILL / CHECKOUT
// ============================================================================

export async function POST(req) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '') ||
                  req.cookies?.get('access_token')?.value ||
                  req.cookies?.get('auth_token')?.value;

    if (!token) {
      return errorResponse('Unauthorized', 401);
    }

    const user = verifyToken(token);
    if (!user) {
      return errorResponse('Invalid token', 401);
    }

    const body = await req.json();
    const {
      clientBillId,
      invoiceNumber,
      sessionId,
      storeId,
      counterId,
      customerName = 'Walk-in Customer',
      customerMobile = '',
      paymentMode,
      payments = [],
      items = [],
      orderDiscount = 0,
      roundOff = 0,
    } = body;

    if (!storeId || !items.length || !paymentMode) {
      return errorResponse('Missing required fields', 400);
    }

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;

    for (const item of items) {
      const lineAmount = item.qty * item.sellingPrice;
      subtotal += lineAmount;
      totalTax += (Math.max(0, lineAmount - item.discountAmount) * item.taxRate) / 100;
    }

    const totalDiscount = orderDiscount + items.reduce((sum, item) => sum + item.discountAmount, 0);
    const grandTotal = Math.max(0, subtotal - totalDiscount + totalTax + roundOff);

    // Create sales bill
    const billRes = await query(
      `
      INSERT INTO sales_bills (
        store_id, customer_id, session_id, customer_name, customer_mobile,
        total_amount, total_tax, discount_amount, round_off,
        payment_mode, status, created_by, created_at
      ) VALUES (
        $1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, 'completed', $10, NOW()
      ) RETURNING id
      `,
      [
        storeId,
        sessionId || null,
        customerName,
        customerMobile,
        grandTotal,
        totalTax,
        totalDiscount,
        roundOff,
        paymentMode,
        user.id,
      ]
    );

    const billId = billRes.rows[0]?.id;
    if (!billId) {
      return errorResponse('Failed to create bill', 500);
    }

    // Insert bill items
    for (const item of items) {
      await query(
        `
        INSERT INTO sales_bill_items (
          sales_bill_id, product_id, qty, selling_price, mrp, tax_rate, discount_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          billId,
          item.productId,
          item.qty,
          item.sellingPrice,
          item.mrp,
          item.taxRate || 0,
          item.discountAmount || 0,
        ]
      );

      // Update stock (deduction)
      await query(
        `
        INSERT INTO stock_movements (
          product_id, store_id, movement_type, qty, reference_type, reference_id, created_at
        ) VALUES ($1, $2, 'out', $3, 'sales_bill', $4, NOW())
        `,
        [item.productId, storeId, item.qty, billId]
      );
    }

    // Insert payment record
    const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    await query(
      `
      INSERT INTO sales_bill_payments (
        sales_bill_id, payment_method, amount, reference_no, status, created_at
      ) VALUES ($1, $2, $3, $4, 'completed', NOW())
      `,
      [billId, paymentMode, totalAmount || grandTotal, payments[0]?.referenceNo || '']
    );

    // Generate invoice
    const invoiceRes = await query(
      `
      INSERT INTO invoices (
        bill_id, invoice_number, invoice_type, status, created_at
      ) VALUES ($1, $2, 'sales', 'generated', NOW())
      RETURNING invoice_number
      `,
      [billId, invoiceNumber || `INV-${Date.now()}`]
    );

    return successResponse({
      bill: {
        id: billId,
        invoiceNumber: invoiceRes.rows[0]?.invoice_number,
        billNumber: invoiceNumber,
        customerName,
        grandTotal,
        totalTax,
        paymentMode,
        status: 'completed',
      },
      message: `Bill ${invoiceRes.rows[0]?.invoice_number} created successfully`,
    });
  } catch (err) {
    console.error('POS billing error:', err);
    return errorResponse(err.message, 500);
  }
}

// ============================================================================
// GET BILLS & PRODUCTS
// ============================================================================

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '48');
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * pageSize;

    // Get session info
    let sessionData = null;
    const sessionRes = await query(
      `SELECT * FROM counter_sessions ORDER BY created_at DESC LIMIT 1`
    );
    if (sessionRes.rows.length > 0) {
      sessionData = sessionRes.rows[0];
    }

    // Get stores
    const storesRes = await query(`SELECT id, name FROM stores WHERE status = 'active'`);

    // Get products
    let productsQuery = `
      SELECT
        p.id, p.name, p.sku, p.barcode, p.mrp, p.cost_price, p.category_id,
        p.tax_id, p.image_url,
        c.name as categoryName, c.id as category_id_val,
        b.name as brandName,
        COALESCE(SUM(CASE WHEN sm.movement_type = 'in' THEN sm.qty ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN sm.movement_type = 'out' THEN sm.qty ELSE 0 END), 0) as availableStock,
        COALESCE(pr.selling_price, p.mrp) as selling_price,
        COALESCE(t.rate, 0) as taxRate
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_rates pr ON p.id = pr.product_id
      LEFT JOIN taxes t ON p.tax_id = t.id
      LEFT JOIN stock_movements sm ON p.id = sm.product_id
      WHERE p.status = 'active'
    `;

    const params = [];

    if (search) {
      productsQuery += ` AND (
        LOWER(p.name) LIKE $${params.length + 1}
        OR LOWER(p.sku) LIKE $${params.length + 2}
        OR LOWER(p.barcode) LIKE $${params.length + 3}
      )`;
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    }

    productsQuery += ` GROUP BY p.id, c.id, b.id, pr.selling_price, t.rate
      ORDER BY p.name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    params.push(pageSize, offset);

    const productsRes = await query(productsQuery, params);

    // Get recent bills
    const billsRes = await query(`
      SELECT
        sb.id, sb.customer_name as customerName, sb.total_amount as grandTotal,
        sb.payment_mode as paymentMode, sb.status,
        ROW_NUMBER() OVER (ORDER BY sb.created_at DESC) as billNumber
      FROM sales_bills sb
      ORDER BY sb.created_at DESC
      LIMIT 10
    `);

    return successResponse({
      products: productsRes.rows,
      recentBills: billsRes.rows,
      session: sessionData,
      stores: storesRes.rows,
      pagination: { page, pageSize, total: productsRes.rowCount },
    });
  } catch (err) {
    console.error('POS fetch error:', err);
    return errorResponse(err.message, 500);
  }
}

// ============================================================================
// SYNC OFFLINE BILLS
// ============================================================================

export async function PUT(req) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return errorResponse('Unauthorized', 401);
    }

    const user = verifyToken(token);
    if (!user) {
      return errorResponse('Invalid token', 401);
    }

    const body = await req.json();
    const { offlineBills = [] } = body;

    if (!Array.isArray(offlineBills) || offlineBills.length === 0) {
      return errorResponse('No bills to sync', 400);
    }

    let syncedCount = 0;
    const errors = [];

    for (const billPayload of offlineBills) {
      try {
        const {
          clientBillId,
          invoiceNumber,
          storeId,
          customerName,
          customerMobile,
          paymentMode,
          items = [],
          orderDiscount = 0,
          roundOff = 0,
        } = billPayload;

        if (!storeId || !items.length) continue;

        // Calculate totals
        let subtotal = 0;
        let totalTax = 0;

        for (const item of items) {
          const lineAmount = item.qty * item.sellingPrice;
          subtotal += lineAmount;
          totalTax += (Math.max(0, lineAmount - item.discountAmount) * item.taxRate) / 100;
        }

        const totalDiscount = orderDiscount + items.reduce((sum, item) => sum + item.discountAmount, 0);
        const grandTotal = Math.max(0, subtotal - totalDiscount + totalTax + roundOff);

        // Create bill
        const billRes = await query(
          `
          INSERT INTO sales_bills (
            store_id, customer_name, customer_mobile, total_amount, total_tax,
            discount_amount, round_off, payment_mode, status, created_by, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', $9, NOW())
          RETURNING id
          `,
          [storeId, customerName, customerMobile, grandTotal, totalTax, totalDiscount, roundOff, paymentMode, user.id]
        );

        const billId = billRes.rows[0]?.id;

        // Insert items
        for (const item of items) {
          await query(
            `
            INSERT INTO sales_bill_items (
              sales_bill_id, product_id, qty, selling_price, tax_rate, discount_amount
            ) VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [billId, item.productId, item.qty, item.sellingPrice, item.taxRate || 0, item.discountAmount || 0]
          );

          // Update stock
          await query(
            `
            INSERT INTO stock_movements (product_id, store_id, movement_type, qty, reference_type, reference_id, created_at)
            VALUES ($1, $2, 'out', $3, 'sales_bill', $4, NOW())
            `,
            [item.productId, storeId, item.qty, billId]
          );
        }

        // Record payment
        await query(
          `
          INSERT INTO sales_bill_payments (sales_bill_id, payment_method, amount, status, created_at)
          VALUES ($1, $2, $3, 'completed', NOW())
          `,
          [billId, paymentMode, grandTotal]
        );

        syncedCount++;
      } catch (billErr) {
        errors.push(billErr.message);
      }
    }

    return successResponse({
      syncedCount,
      totalBills: offlineBills.length,
      errors: errors.length > 0 ? errors : null,
    });
  } catch (err) {
    console.error('Sync error:', err);
    return errorResponse(err.message, 500);
  }
}