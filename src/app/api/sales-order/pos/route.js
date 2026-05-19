import { NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { successResponse, errorResponse, validationError } from '@/lib/api-response';
import { ensureSalesBillingSchema } from '@/lib/salesBillingSchema';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapProductRow(row) {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    barcode: row.barcode || '',
    sku: row.sku || '',
    unit: row.unit || 'PCS',
    mrp: toNumber(row.mrp),
    sellingPrice: toNumber(row.selling_price),
    costPrice: toNumber(row.cost_price),
    taxRate: toNumber(row.tax_rate),
    categoryName: row.category_name || '',
    brandName: row.brand_name || '',
    manufacturerName: row.manufacturer_name || '',
    availableStock: toNumber(row.available_stock),
    imageUrl: row.image_url || null,
  };
}

function buildStockAvailabilityQuery() {
  return `
    SELECT
      p.id,
      p.product_id,
      p.name,
      p.barcode,
      p.sku,
      p.mrp,
      p.selling_price,
      p.cost_price,
      p.unit,
      p.image_url,
      COALESCE(t.rate, 0) AS tax_rate,
      c.name AS category_name,
      b.name AS brand_name,
      m.name AS manufacturer_name,
      COALESCE(si.qty_in, 0) - COALESCE(so.qty_out, 0) AS available_stock
    FROM products p
    LEFT JOIN taxes t ON t.id = p.tax_id
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN brands b ON b.id = p.brand_id
    LEFT JOIN manufacturers m ON m.id = p.manufacturer_id
    LEFT JOIN (
      SELECT sii.product_id, SUM(sii.qty) AS qty_in
      FROM stock_in_items sii
      INNER JOIN stock_in s ON s.id = sii.stock_in_id
      WHERE s.status = 'confirmed'
      GROUP BY sii.product_id
    ) si ON si.product_id = p.id
    LEFT JOIN (
      SELECT soi.product_id, SUM(soi.qty) AS qty_out
      FROM stock_out_items soi
      INNER JOIN stock_out s ON s.id = soi.stock_out_id
      WHERE s.status = 'confirmed'
      GROUP BY soi.product_id
    ) so ON so.product_id = p.id
  `;
}

export async function GET(request) {
  try {
    await ensureSalesBillingSchema();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '24', 10);
    const offset = (page - 1) * pageSize;

    const productParams = [];
    let whereClause = '';

    if (search) {
      productParams.push(`%${search}%`);
      whereClause = `WHERE p.name ILIKE $1 OR COALESCE(p.barcode, '') ILIKE $1 OR COALESCE(p.sku, '') ILIKE $1`;
    }

    const countResult = await query(
      `SELECT COUNT(*) AS count
       FROM products p
       ${whereClause}`,
      productParams
    );

    productParams.push(pageSize, offset);

    const productResult = await query(
      `${buildStockAvailabilityQuery()}
       ${whereClause}
       ORDER BY p.name ASC, p.id DESC
       LIMIT $${productParams.length - 1} OFFSET $${productParams.length}`,
      productParams
    );

    const recentBillsResult = await query(
      `SELECT sb.id, sb.bill_number, sb.customer_name, sb.customer_mobile, sb.subtotal,
              sb.discount_total, sb.tax_total, sb.round_off, sb.grand_total,
              sb.paid_amount, sb.balance_amount, sb.payment_mode, sb.status, sb.created_at,
              u.name AS user_name, s.name AS store_name
       FROM sales_bills sb
       LEFT JOIN users u ON u.id = sb.user_id
       LEFT JOIN stores s ON s.id = sb.store_id
       ORDER BY sb.created_at DESC
       LIMIT 12`
    );

    const sessionResult = await query(
      `SELECT ucs.id, ucs.user_id, ucs.counter_id, ucs.device_id, ucs.store_id,
              ucs.session_id, ucs.session_start_at, ucs.session_end_at, ucs.is_active,
              ucs.serial_number, ucs.counter_name, ucs.meta,
              u.name AS user_name, s.name AS store_name
       FROM user_counter_sessions ucs
       LEFT JOIN users u ON u.id = ucs.user_id
       LEFT JOIN stores s ON s.id = ucs.store_id
       WHERE ucs.is_active = TRUE
       ORDER BY ucs.session_start_at DESC, ucs.id DESC
       LIMIT 1`
    );

    const storesResult = await query(
      `SELECT id, name
       FROM stores
       ORDER BY id ASC`
    );

    return successResponse({
      products: productResult.rows.map(mapProductRow),
      totalProducts: toNumber(countResult.rows[0]?.count),
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(toNumber(countResult.rows[0]?.count) / pageSize)),
      session: sessionResult.rows[0]
        ? {
            id: sessionResult.rows[0].id,
            userId: sessionResult.rows[0].user_id,
            counterId: sessionResult.rows[0].counter_id,
            deviceId: sessionResult.rows[0].device_id,
            storeId: sessionResult.rows[0].store_id,
            sessionId: sessionResult.rows[0].session_id,
            sessionStartAt: sessionResult.rows[0].session_start_at,
            sessionEndAt: sessionResult.rows[0].session_end_at,
            isActive: sessionResult.rows[0].is_active,
            serialNumber: sessionResult.rows[0].serial_number || '',
            counterName: sessionResult.rows[0].counter_name || '',
            userName: sessionResult.rows[0].user_name || '',
            storeName: sessionResult.rows[0].store_name || '',
            meta: sessionResult.rows[0].meta || {},
          }
        : null,
      recentBills: recentBillsResult.rows.map((row) => ({
        id: row.id,
        billNumber: row.bill_number,
        customerName: row.customer_name || '',
        customerMobile: row.customer_mobile || '',
        subtotal: toNumber(row.subtotal),
        discountTotal: toNumber(row.discount_total),
        taxTotal: toNumber(row.tax_total),
        roundOff: toNumber(row.round_off),
        grandTotal: toNumber(row.grand_total),
        paidAmount: toNumber(row.paid_amount),
        balanceAmount: toNumber(row.balance_amount),
        paymentMode: row.payment_mode,
        status: row.status,
        userName: row.user_name || '',
        storeName: row.store_name || '',
        createdAt: row.created_at,
      })),
      stores: storesResult.rows,
    });
  } catch (err) {
    return errorResponse(err.message || 'Failed to load POS data');
  }
}

export async function POST(request) {
  try {
    await ensureSalesBillingSchema();

    const body = await request.json();
    const clientBillId = String(body.clientBillId || body.client_bill_id || '').trim();
    const items = Array.isArray(body.items) ? body.items : [];
    const payments = Array.isArray(body.payments) ? body.payments : [];
    const sessionId = String(body.sessionId || body.session_id || '').trim();
    const userId = Number(body.userId || body.user_id || 0);
    const storeId = Number(body.storeId || body.store_id || 0);
    const counterId = body.counterId || body.counter_id ? Number(body.counterId || body.counter_id) : null;
    const customerName = String(body.customerName || body.customer_name || '').trim();
    const customerMobile = String(body.customerMobile || body.customer_mobile || '').trim();
    const remarks = String(body.remarks || '').trim();
    const orderDiscount = toNumber(body.orderDiscount ?? body.discount_total ?? 0);
    const roundOff = toNumber(body.roundOff ?? body.round_off ?? 0);
    const paymentMode = String(body.paymentMode || body.payment_mode || 'cash').trim().toLowerCase();

    if (clientBillId) {
      const existingBillResult = await query(
        `SELECT id, bill_number, session_id, subtotal, discount_total, tax_total,
                round_off, grand_total, paid_amount, balance_amount, payment_mode,
                status, customer_name, customer_mobile, remarks, meta, created_at
         FROM sales_bills
         WHERE meta->>'clientBillId' = $1
         LIMIT 1`,
        [clientBillId]
      );

      const existingBill = existingBillResult.rows[0];
      if (existingBill) {
        const existingItemsResult = await query(
          `SELECT product_id, product_name, barcode, sku, qty, mrp, selling_price,
                  discount_amount, tax_rate, tax_amount, line_total
           FROM sales_bill_items
           WHERE sales_bill_id = $1
           ORDER BY id ASC`,
          [existingBill.id]
        );

        const existingPaymentsResult = await query(
          `SELECT method, amount, reference_no, meta
           FROM sales_bill_payments
           WHERE sales_bill_id = $1
           ORDER BY id ASC`,
          [existingBill.id]
        );

        return successResponse(
          {
            bill: {
              id: existingBill.id,
              billNumber: existingBill.bill_number,
              sessionId: existingBill.session_id,
              subtotal: toNumber(existingBill.subtotal),
              discountTotal: toNumber(existingBill.discount_total),
              taxTotal: toNumber(existingBill.tax_total),
              roundOff: toNumber(existingBill.round_off),
              grandTotal: toNumber(existingBill.grand_total),
              paidAmount: toNumber(existingBill.paid_amount),
              balanceAmount: toNumber(existingBill.balance_amount),
              status: existingBill.status,
              paymentMode: existingBill.payment_mode,
              customerName: existingBill.customer_name || '',
              customerMobile: existingBill.customer_mobile || '',
              remarks: existingBill.remarks || '',
              items: existingItemsResult.rows.map((item) => ({
                productId: item.product_id,
                productName: item.product_name,
                barcode: item.barcode || '',
                sku: item.sku || '',
                qty: toNumber(item.qty),
                mrp: toNumber(item.mrp),
                sellingPrice: toNumber(item.selling_price),
                discountAmount: toNumber(item.discount_amount),
                taxRate: toNumber(item.tax_rate),
                taxAmount: toNumber(item.tax_amount),
                lineTotal: toNumber(item.line_total),
              })),
              payments: existingPaymentsResult.rows.map((payment) => ({
                method: payment.method,
                amount: toNumber(payment.amount),
                referenceNo: payment.reference_no || '',
                meta: payment.meta || {},
              })),
              meta: existingBill.meta || {},
              createdAt: existingBill.created_at,
            },
          },
          'POS bill already synced',
          200
        );
      }
    }

    if (!sessionId) {
      return validationError({ sessionId: 'Active cashier session is required' });
    }

    if (items.length === 0) {
      return validationError({ items: 'At least one product is required' });
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const sessionResult = await client.query(
        `SELECT id, session_id, store_id, user_id, counter_id, is_active, meta
         FROM user_counter_sessions
         WHERE session_id = $1
         LIMIT 1`,
        [sessionId]
      );

      const session = sessionResult.rows[0];
      if (!session || !session.is_active) {
        throw new Error('Cashier session is closed or missing');
      }

      const productIds = [...new Set(items.map((item) => Number(item.productId || item.id)).filter((id) => Number.isFinite(id) && id > 0))];
      if (productIds.length === 0) {
        throw new Error('Valid items are required');
      }

      const productResult = await client.query(
        `${buildStockAvailabilityQuery()}
         WHERE p.id = ANY($1::bigint[])`,
        [productIds]
      );

      const productMap = new Map(productResult.rows.map((row) => [Number(row.id), row]));
      const billItems = [];
      let subtotal = 0;
      let discountTotal = orderDiscount;
      let taxTotal = 0;
      let totalCost = 0;

      for (const item of items) {
        const productId = Number(item.productId || item.id);
        const product = productMap.get(productId);

        if (!product) {
          throw new Error(`Product not found for id ${productId}`);
        }

        const qty = toNumber(item.qty, 1);
        if (qty <= 0) {
          throw new Error(`Invalid quantity for ${product.name}`);
        }

        if (toNumber(product.available_stock) < qty) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }

        const sellingPrice = toNumber(item.sellingPrice ?? item.selling_price ?? product.selling_price ?? product.mrp);
        const mrp = toNumber(item.mrp ?? product.mrp ?? sellingPrice);
        const lineDiscount = toNumber(item.discountAmount ?? item.discount_amount ?? 0);
        const taxRate = toNumber(item.taxRate ?? item.tax_rate ?? product.tax_rate ?? 0);
        const grossLine = sellingPrice * qty;
        const taxableLine = Math.max(0, grossLine - lineDiscount);
        const lineTax = Number(((taxableLine * taxRate) / 100).toFixed(2));
        const lineTotal = Number((taxableLine + lineTax).toFixed(2));

        subtotal += grossLine;
        discountTotal += lineDiscount;
        taxTotal += lineTax;
        totalCost += toNumber(product.cost_price) * qty;

        billItems.push({
          productId: product.id,
          productName: product.name,
          barcode: product.barcode,
          sku: product.sku,
          qty,
          mrp,
          sellingPrice,
          discountAmount: lineDiscount,
          taxRate,
          taxAmount: lineTax,
          lineTotal,
          costPrice: toNumber(product.cost_price),
        });
      }

      const grandTotal = Number((subtotal - discountTotal + taxTotal + roundOff).toFixed(2));
      const paymentTotal = payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
      const paidAmount = paymentTotal > 0 ? Number(paymentTotal.toFixed(2)) : grandTotal;
      const balanceAmount = Number(Math.max(0, grandTotal - paidAmount).toFixed(2));
      const finalStatus = balanceAmount > 0 ? 'due' : 'paid';
      const effectivePaymentMode = paymentMode || (payments.length > 1 ? 'split' : 'cash');

      const billSeedNumber = `POS-${Date.now()}`;
      const billInsert = await client.query(
        `INSERT INTO sales_bills (
          bill_number, session_id, user_id, store_id, counter_id,
          customer_name, customer_mobile, subtotal, discount_total, tax_total,
          round_off, grand_total, paid_amount, balance_amount, payment_mode,
          payment_meta, status, remarks, meta, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          $16::jsonb, $17, $18, $19::jsonb, NOW(), NOW()
        )
        RETURNING id`,
        [
          billSeedNumber,
          sessionId,
          Number.isFinite(userId) && userId > 0 ? userId : session.user_id,
          Number.isFinite(storeId) && storeId > 0 ? storeId : session.store_id,
          counterId || session.counter_id || null,
          customerName || null,
          customerMobile || null,
          subtotal,
          discountTotal,
          taxTotal,
          roundOff,
          grandTotal,
          paidAmount,
          balanceAmount,
          effectivePaymentMode,
          JSON.stringify(payments),
          finalStatus,
          remarks || null,
          JSON.stringify({ ...body, clientBillId: clientBillId || undefined }),
        ]
      );

      const billId = billInsert.rows[0].id;
      const billNumber = `POS-${String(billId).padStart(6, '0')}`;

      await client.query('UPDATE sales_bills SET bill_number = $1 WHERE id = $2', [billNumber, billId]);

      for (const item of billItems) {
        await client.query(
          `INSERT INTO sales_bill_items (
            sales_bill_id, product_id, product_name, barcode, sku,
            qty, mrp, selling_price, discount_amount, tax_rate, tax_amount, line_total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            billId,
            item.productId,
            item.productName,
            item.barcode || null,
            item.sku || null,
            item.qty,
            item.mrp,
            item.sellingPrice,
            item.discountAmount,
            item.taxRate,
            item.taxAmount,
            item.lineTotal,
          ]
        );
      }

      for (const payment of payments) {
        const amount = toNumber(payment.amount);
        if (amount <= 0) continue;
        await client.query(
          `INSERT INTO sales_bill_payments (
            sales_bill_id, method, amount, reference_no, meta
          ) VALUES ($1, $2, $3, $4, $5::jsonb)`,
          [
            billId,
            String(payment.method || payment.mode || effectivePaymentMode || 'cash'),
            amount,
            payment.referenceNo || payment.reference_no || null,
            JSON.stringify(payment),
          ]
        );
      }

      const stockOutInsert = await client.query(
        `INSERT INTO stock_out (
          transaction_id, method, destination_id, apply_taxes, add_products_prefill,
          status, purchase_order_id, invoice_number, invoice_date, remarks,
          total_items, total_cost, total_tax, reference_type, reference_id, meta, created_at, confirmed_at
        ) VALUES (
          $1, 'sale', $2, TRUE, FALSE,
          'confirmed', NULL, $3, CURRENT_DATE, $4,
          $5, $6, $7, 'POS Bill', $8, $9::jsonb, NOW(), NOW()
        ) RETURNING id`,
        [
          billNumber,
          Number.isFinite(storeId) && storeId > 0 ? storeId : session.store_id,
          billNumber,
          remarks || null,
          billItems.reduce((sum, item) => sum + item.qty, 0),
          totalCost,
          taxTotal,
          billNumber,
          JSON.stringify({ billId, billNumber, source: 'pos' }),
        ]
      );

      const stockOutId = stockOutInsert.rows[0].id;
      for (const item of billItems) {
        await client.query(
          `INSERT INTO stock_out_items (
            stock_out_id, product_id, product_name, qty, cost_price, tax_value, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            stockOutId,
            item.productId,
            item.productName,
            item.qty,
            item.costPrice,
            item.taxAmount,
          ]
        );
      }

      await client.query(
        `UPDATE user_counter_sessions
         SET meta = COALESCE(meta, '{}'::jsonb) || $1::jsonb,
             updated_at = NOW()
         WHERE session_id = $2`,
        [JSON.stringify({ last_bill_id: billId, last_bill_number: billNumber }), sessionId]
      );

      await client.query('COMMIT');

      return successResponse(
        {
          bill: {
            id: billId,
            billNumber,
            sessionId,
            subtotal: Number(subtotal.toFixed(2)),
            discountTotal: Number(discountTotal.toFixed(2)),
            taxTotal: Number(taxTotal.toFixed(2)),
            roundOff: Number(roundOff.toFixed(2)),
            grandTotal,
            paidAmount,
            balanceAmount,
            status: finalStatus,
            paymentMode: effectivePaymentMode,
            customerName,
            customerMobile,
            remarks,
            items: billItems,
          },
        },
        'POS bill created successfully',
        201
      );
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    return errorResponse(err.message || 'Failed to create bill');
  }
}
