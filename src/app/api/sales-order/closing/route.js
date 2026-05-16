import { query, getClient } from '@/lib/db';
import { successResponse, errorResponse, validationError, notFound } from '@/lib/apiResponse';
import { ensureSalesBillingSchema } from '@/lib/salesBillingSchema';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET() {
  try {
    await ensureSalesBillingSchema();

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

    const session = sessionResult.rows[0];
    if (!session) {
      return successResponse({ session: null, closing: null });
    }

    const totalsResult = await query(
      `SELECT
        COALESCE(SUM(CASE WHEN sb.payment_mode = 'cash' THEN sb.paid_amount ELSE 0 END), 0) AS cash_sales,
        COALESCE(SUM(CASE WHEN sb.payment_mode = 'card' THEN sb.paid_amount ELSE 0 END), 0) AS card_sales,
        COALESCE(SUM(CASE WHEN sb.payment_mode = 'upi' THEN sb.paid_amount ELSE 0 END), 0) AS upi_sales,
        COALESCE(SUM(CASE WHEN sb.payment_mode = 'split' THEN sb.paid_amount ELSE 0 END), 0) AS split_sales,
        COALESCE(SUM(sb.grand_total), 0) AS gross_sales,
        COALESCE(SUM(sb.discount_total), 0) AS discount_total,
        COALESCE(SUM(sb.tax_total), 0) AS tax_total,
        COALESCE(SUM(sb.balance_amount), 0) AS due_total
       FROM sales_bills sb
       WHERE sb.session_id = $1`,
      [session.session_id]
    );

    const closingResult = await query(
      `SELECT *
       FROM cashier_closings
       WHERE session_id = $1
       LIMIT 1`,
      [session.session_id]
    );

    return successResponse({
      session: {
        id: session.id,
        sessionId: session.session_id,
        userId: session.user_id,
        counterId: session.counter_id,
        deviceId: session.device_id,
        storeId: session.store_id,
        userName: session.user_name || '',
        storeName: session.store_name || '',
        counterName: session.counter_name || '',
        openingCash: toNumber(session.meta?.opening_cash || 0),
        startedAt: session.session_start_at,
        isActive: session.is_active,
      },
      totals: {
        cashSales: toNumber(totalsResult.rows[0].cash_sales),
        cardSales: toNumber(totalsResult.rows[0].card_sales),
        upiSales: toNumber(totalsResult.rows[0].upi_sales),
        splitSales: toNumber(totalsResult.rows[0].split_sales),
        grossSales: toNumber(totalsResult.rows[0].gross_sales),
        discountTotal: toNumber(totalsResult.rows[0].discount_total),
        taxTotal: toNumber(totalsResult.rows[0].tax_total),
        dueTotal: toNumber(totalsResult.rows[0].due_total),
      },
      closing: closingResult.rows[0] || null,
    });
  } catch (err) {
    return errorResponse(err.message || 'Failed to load closing summary');
  }
}

export async function POST(request) {
  try {
    await ensureSalesBillingSchema();

    const body = await request.json();
    const sessionId = String(body.sessionId || body.session_id || '').trim();
    const actualCash = toNumber(body.actualCash ?? body.actual_cash ?? 0);
    const openingCash = toNumber(body.openingCash ?? body.opening_cash ?? 0);
    const remarks = String(body.remarks || '').trim();

    if (!sessionId) {
      return validationError({ sessionId: 'Session id is required' });
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const sessionResult = await client.query(
        `SELECT id, session_id, user_id, store_id, counter_id, is_active, meta
         FROM user_counter_sessions
         WHERE session_id = $1
         LIMIT 1
         FOR UPDATE`,
        [sessionId]
      );

      const session = sessionResult.rows[0];
      if (!session) {
        return notFound('Session not found');
      }
      if (!session.is_active) {
        return errorResponse('Session is already closed', 409);
      }

      const totalsResult = await client.query(
        `SELECT
          COALESCE(SUM(CASE WHEN sb.payment_mode = 'cash' THEN sb.paid_amount ELSE 0 END), 0) AS cash_sales,
          COALESCE(SUM(CASE WHEN sb.payment_mode = 'card' THEN sb.paid_amount ELSE 0 END), 0) AS card_sales,
          COALESCE(SUM(CASE WHEN sb.payment_mode = 'upi' THEN sb.paid_amount ELSE 0 END), 0) AS upi_sales,
          COALESCE(SUM(CASE WHEN sb.payment_mode = 'split' THEN sb.paid_amount ELSE 0 END), 0) AS split_sales,
          COALESCE(SUM(sb.grand_total), 0) AS gross_sales,
          COALESCE(SUM(sb.discount_total), 0) AS discount_total,
          COALESCE(SUM(sb.tax_total), 0) AS tax_total,
          COALESCE(SUM(sb.balance_amount), 0) AS due_total
         FROM sales_bills sb
         WHERE sb.session_id = $1`,
        [sessionId]
      );

      const cashSales = toNumber(totalsResult.rows[0].cash_sales);
      const expectedCash = Number((openingCash + cashSales).toFixed(2));
      const variance = Number((actualCash - expectedCash).toFixed(2));
      const paymentBreakup = {
        cashSales,
        cardSales: toNumber(totalsResult.rows[0].card_sales),
        upiSales: toNumber(totalsResult.rows[0].upi_sales),
        splitSales: toNumber(totalsResult.rows[0].split_sales),
        grossSales: toNumber(totalsResult.rows[0].gross_sales),
        discountTotal: toNumber(totalsResult.rows[0].discount_total),
        taxTotal: toNumber(totalsResult.rows[0].tax_total),
        dueTotal: toNumber(totalsResult.rows[0].due_total),
      };

      const closingInsert = await client.query(
        `INSERT INTO cashier_closings (
          session_id, user_id, store_id, opening_cash, expected_cash,
          actual_cash, variance, payment_breakup, remarks, meta, closed_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb, NOW(), NOW())
        RETURNING *`,
        [
          sessionId,
          session.user_id,
          session.store_id,
          openingCash,
          expectedCash,
          actualCash,
          variance,
          JSON.stringify(paymentBreakup),
          remarks || null,
          JSON.stringify(body),
        ]
      );

      await client.query(
        `UPDATE user_counter_sessions
         SET is_active = FALSE,
             session_end_at = NOW(),
             meta = COALESCE(meta, '{}'::jsonb) || $1::jsonb,
             updated_at = NOW()
         WHERE session_id = $2`,
        [JSON.stringify({ closing_id: closingInsert.rows[0].id, closed_at: new Date().toISOString() }), sessionId]
      );

      await client.query('COMMIT');

      return successResponse({
        closing: {
          id: closingInsert.rows[0].id,
          sessionId,
          openingCash,
          expectedCash,
          actualCash,
          variance,
          paymentBreakup,
          remarks,
        },
      }, 'Cashier session closed successfully', 201);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    return errorResponse(err.message || 'Failed to close session');
  }
}
