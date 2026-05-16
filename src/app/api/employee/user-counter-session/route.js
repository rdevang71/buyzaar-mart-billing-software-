import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureUserCounterSessionSchema } from '@/lib/userCounterSessionSchema';

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
    meta: row.meta || {},
  };
}

export async function GET(request) {
  try {
    await ensureUserCounterSessionSchema();

    const url = new URL(request.url);
    const dateFrom = parseDate(url.searchParams.get('dateFrom'));
    const dateTo = parseDate(url.searchParams.get('dateTo'));

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
              u.name AS user_name,
              s.name AS store_name
       FROM user_counter_sessions ucs
       LEFT JOIN users u ON u.id = ucs.user_id
       LEFT JOIN stores s ON s.id = ucs.store_id
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
