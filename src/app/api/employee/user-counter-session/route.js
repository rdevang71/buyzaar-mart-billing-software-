import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureUserCounterSessionSchema } from '@/lib/userCounterSessionSchema';
import { ensureSalesBillingSchema } from '@/lib/salesBillingSchema';
import { extractAuthUser, requireStore } from '@/lib/api-protection';

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function normalizeSessionRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    counterId: row.counter_id,
    deviceId: row.device_id,
    storeId: row.store_id,
    sessionId: row.session_id,
    sessionStartAt: row.session_start_at,
    sessionEndAt: row.session_end_at,
    isActive: row.is_active,
    serialNumber: row.serial_number || '',
    storeName: row.store_name || '',
    counterName: row.counter_name || '',
    userName: row.user_name || '',
    openingCash: Number(row.opening_cash || 0),
    grossSales: Number(row.gross_sales || row.payment_breakup?.grossSales || 0),
    cashSales: Number(row.cash_sales || row.payment_breakup?.cashSales || 0),
    cardSales: Number(row.card_sales || row.payment_breakup?.cardSales || 0),
    upiSales: Number(row.upi_sales || row.payment_breakup?.upiSales || 0),
    paidTotal: Number(row.paid_total || row.payment_breakup?.paidTotal || 0),
    expectedCash: Number(row.expected_cash || 0),
    actualCash: Number(row.actual_cash || 0),
    variance: Number(row.variance || 0),
    closedAt: row.closed_at || null,
    closingRemarks: row.closing_remarks || '',
    meta: row.meta || {},
  };
}

export async function GET(request) {
  try {
    await ensureUserCounterSessionSchema();
    await ensureSalesBillingSchema();
    const auth = await extractAuthUser(request);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const dateFrom = parseDate(url.searchParams.get('dateFrom'));
    const dateTo = parseDate(url.searchParams.get('dateTo'));
    const storeId = Number(url.searchParams.get('storeId') || url.searchParams.get('store_id') || 0);

    const whereClauses = [];
    const params = [];

    if (dateFrom) {
      params.push(dateFrom);
      whereClauses.push(`ucs.session_start_at >= $${params.length}::date`);
    }

    if (dateTo) {
      params.push(dateTo);
      whereClauses.push(`ucs.session_start_at < ($${params.length}::date + INTERVAL '1 day')`);
    }

    if (Number.isFinite(storeId) && storeId > 0) {
      params.push(storeId);
      whereClauses.push(`ucs.store_id = $${params.length}`);
    }

    const user = auth.user;
    if (user && user.role !== 'super_admin') {
      const assignedStores = (user.assigned_stores || []).map(Number).filter(Number.isFinite);
      if (assignedStores.length === 0) {
        return NextResponse.json([]);
      }
      params.push(assignedStores);
      whereClauses.push(`ucs.store_id = ANY($${params.length}::int[])`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const res = await query(
      `SELECT ucs.id,
              ucs.user_id,
              ucs.counter_id,
              ucs.device_id,
              ucs.store_id,
              ucs.session_id,
              ucs.session_start_at,
              ucs.session_end_at,
              ucs.is_active,
              ucs.serial_number,
              ucs.counter_name,
              ucs.meta,
              cc.opening_cash,
              cc.expected_cash,
              cc.actual_cash,
              cc.variance,
              cc.payment_breakup,
              cc.closed_at,
              cc.remarks AS closing_remarks,
              COALESCE((cc.payment_breakup->>'grossSales')::numeric, 0) AS gross_sales,
              COALESCE((cc.payment_breakup->>'cashSales')::numeric, 0) AS cash_sales,
              COALESCE((cc.payment_breakup->>'cardSales')::numeric, 0) AS card_sales,
              COALESCE((cc.payment_breakup->>'upiSales')::numeric, 0) AS upi_sales,
              COALESCE((cc.payment_breakup->>'paidTotal')::numeric, 0) AS paid_total,
              u.name AS user_name,
              s.name AS store_name
       FROM user_counter_sessions ucs
       LEFT JOIN users u ON u.id = ucs.user_id
       LEFT JOIN stores s ON s.id = ucs.store_id
       LEFT JOIN cashier_closings cc ON cc.session_id = ucs.session_id
       ${whereSql}
       ORDER BY ucs.session_start_at DESC, ucs.id DESC`,
      params
    );

    return NextResponse.json(res.rows.map(normalizeSessionRow));
  } catch (err) {
    console.error('[employee user counter session GET]', err.message);
    return NextResponse.json([]);
  }
}

export async function POST(request) {
  try {
    await ensureUserCounterSessionSchema();
    const auth = await extractAuthUser(request);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const userId = Number(body.userId || body.user_id);
    const storeId = body.storeId || body.store_id ? Number(body.storeId || body.store_id) : null;
    const counterId = body.counterId || body.counter_id ? Number(body.counterId || body.counter_id) : null;
    const deviceId = body.deviceId || body.device_id ? Number(body.deviceId || body.device_id) : null;
    const serialNumber = String(body.serialNumber || body.serial_number || '').trim();
    const counterName = String(body.counterName || body.counter_name || '').trim();
    const openingCash = Number(body.openingCash || body.opening_cash || 0);

    if (!Number.isFinite(userId) || userId <= 0) {
      return NextResponse.json({ error: 'User id is required' }, { status: 400 });
    }

    if (storeId) {
      const storeCheck = requireStore(auth.user, storeId);
      if (storeCheck.error) return storeCheck.error;
    }

    const sessionId = `SESSION-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const meta = {
      opening_cash: openingCash,
      source: 'pos',
      opened_at: new Date().toISOString(),
      ...(body.meta || {}),
    };

    const result = await query(
      `INSERT INTO user_counter_sessions (
        user_id, counter_id, device_id, store_id, session_id,
        session_start_at, is_active, serial_number, counter_name, meta
       ) VALUES ($1, $2, $3, $4, $5, NOW(), TRUE, $6, $7, $8::jsonb)
       RETURNING id, user_id, counter_id, device_id, store_id, session_id, session_start_at, session_end_at, is_active, serial_number, counter_name, meta`,
      [userId, counterId, deviceId, storeId, sessionId, serialNumber || null, counterName || null, JSON.stringify(meta)]
    );

    return NextResponse.json(normalizeSessionRow(result.rows[0]), { status: 201 });
  } catch (err) {
    console.error('[employee user counter session POST]', err.message);
    return NextResponse.json({ error: 'Failed to open user counter session' }, { status: 500 });
  }
}
