import { query, getClient } from '@/lib/db';
import { successResponse, errorResponse, validationError, notFoundError } from '@/lib/api-response';
import { ensureSalesBillingSchema } from '@/lib/salesBillingSchema';
import { extractAuthUser, requireStore } from '@/lib/api-protection';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapClosingTotals(row = {}) {
  const openingCash = toNumber(row.opening_cash);
  const cashSales = toNumber(row.cash_sales);
  const expectedCash = Number((openingCash + cashSales).toFixed(2));

  return {
    openingCash,
    cashSales,
    cardSales: toNumber(row.card_sales),
    upiSales: toNumber(row.upi_sales),
    splitSales: toNumber(row.split_sales),
    grossSales: toNumber(row.gross_sales),
    discountTotal: toNumber(row.discount_total),
    taxTotal: toNumber(row.tax_total),
    dueTotal: toNumber(row.due_total),
    paidTotal: toNumber(row.paid_total),
    billCount: toNumber(row.bill_count),
    expectedCash,
  };
}

const SESSION_TOTALS_SQL = `
  WITH bill_totals AS (
    SELECT
      COALESCE(SUM(sb.grand_total), 0) AS gross_sales,
      COALESCE(SUM(sb.discount_total), 0) AS discount_total,
      COALESCE(SUM(sb.tax_total), 0) AS tax_total,
      COALESCE(SUM(sb.balance_amount), 0) AS due_total,
      COUNT(sb.id) AS bill_count
    FROM sales_bills sb
    WHERE sb.session_id = $1
  ),
  payment_totals AS (
    SELECT
      COALESCE(SUM(CASE WHEN sbp.method = 'cash' THEN sbp.amount ELSE 0 END), 0) AS cash_sales,
      COALESCE(SUM(CASE WHEN sbp.method = 'card' THEN sbp.amount ELSE 0 END), 0) AS card_sales,
      COALESCE(SUM(CASE WHEN sbp.method = 'upi' THEN sbp.amount ELSE 0 END), 0) AS upi_sales,
      COALESCE(SUM(CASE WHEN sb.payment_mode = 'split' THEN sbp.amount ELSE 0 END), 0) AS split_sales,
      COALESCE(SUM(sbp.amount), 0) AS paid_total
    FROM sales_bills sb
    LEFT JOIN sales_bill_payments sbp ON sbp.sales_bill_id = sb.id
    WHERE sb.session_id = $1
  )
  SELECT
    COALESCE(($2::jsonb->>'opening_cash')::numeric, 0) AS opening_cash,
    payment_totals.cash_sales,
    payment_totals.card_sales,
    payment_totals.upi_sales,
    payment_totals.split_sales,
    bill_totals.gross_sales,
    bill_totals.discount_total,
    bill_totals.tax_total,
    bill_totals.due_total,
    payment_totals.paid_total,
    bill_totals.bill_count
  FROM bill_totals, payment_totals
`;

export async function GET(request) {
  try {
    await ensureSalesBillingSchema();
    const auth = await extractAuthUser(request);
    if (auth.error || !auth.user) return errorResponse(auth.error || 'Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const requestedSessionId = String(searchParams.get('sessionId') || searchParams.get('session_id') || '').trim();
    const sessionParams = [];
    const sessionWhere = [];

    if (requestedSessionId) {
      sessionParams.push(requestedSessionId);
      sessionWhere.push(`ucs.session_id = $${sessionParams.length}`);
    } else {
      sessionWhere.push('ucs.is_active = TRUE');
      if (auth.user.role !== 'super_admin') {
        sessionParams.push(auth.user.id);
        sessionWhere.push(`ucs.user_id = $${sessionParams.length}`);
      }
    }

    const sessionResult = await query(
      `SELECT ucs.id, ucs.user_id, ucs.counter_id, ucs.device_id, ucs.store_id,
              ucs.session_id, ucs.session_start_at, ucs.session_end_at, ucs.is_active,
              ucs.serial_number, ucs.counter_name, ucs.meta,
              u.name AS user_name, s.name AS store_name
       FROM user_counter_sessions ucs
       LEFT JOIN users u ON u.id = ucs.user_id
       LEFT JOIN stores s ON s.id = ucs.store_id
       WHERE ${sessionWhere.join(' AND ')}
       ORDER BY ucs.session_start_at DESC, ucs.id DESC
       LIMIT 1`,
      sessionParams
    );

    const session = sessionResult.rows[0];
    if (!session) {
      return successResponse({ session: null, closing: null });
    }

    if (auth.user.role !== 'super_admin') {
      const storeCheck = requireStore(auth.user, session.store_id);
      if (storeCheck.error) return storeCheck.error;
    }

    const totalsResult = await query(
      SESSION_TOTALS_SQL,
      [session.session_id, JSON.stringify(session.meta || {})]
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
      totals: mapClosingTotals(totalsResult.rows[0]),
      closing: closingResult.rows[0] || null,
    });
  } catch (err) {
    return errorResponse(err.message || 'Failed to load closing summary');
  }
}

export async function POST(request) {
  try {
    await ensureSalesBillingSchema();
    const auth = await extractAuthUser(request);
    if (auth.error || !auth.user) return errorResponse(auth.error || 'Unauthorized', 401);

    const body = await request.json();
    const sessionId = String(body.sessionId || body.session_id || '').trim();
    const requestedOpeningCash = body.openingCash ?? body.opening_cash;
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
        await client.query('ROLLBACK');
        return notFoundError('Session not found');
      }
      if (!session.is_active) {
        await client.query('ROLLBACK');
        return errorResponse('Session is already closed', 409);
      }

      const storeCheck = requireStore(auth.user, session.store_id);
      if (storeCheck.error) {
        await client.query('ROLLBACK');
        return storeCheck.error;
      }

      const openingCash = requestedOpeningCash == null
        ? toNumber(session.meta?.opening_cash)
        : toNumber(requestedOpeningCash);
      const totalsResult = await client.query(SESSION_TOTALS_SQL, [
        sessionId,
        JSON.stringify({ ...(session.meta || {}), opening_cash: openingCash }),
      ]);

      const totals = mapClosingTotals(totalsResult.rows[0]);
      const cashSales = totals.cashSales;
      const expectedCash = Number((openingCash + cashSales).toFixed(2));
      const actualCash = expectedCash;
      const variance = Number((actualCash - expectedCash).toFixed(2));
      const paymentBreakup = {
        ...totals,
        openingCash,
        expectedCash,
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
          totals: paymentBreakup,
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
