import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureUserCounterSessionSchema } from '@/lib/userCounterSessionSchema';

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function mapUserCounterSessionRow(row) {
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
              u.name AS user_name,
              s.name AS store_name
       FROM user_counter_sessions ucs
       LEFT JOIN users u ON u.id = ucs.user_id
       LEFT JOIN stores s ON s.id = ucs.store_id
       ${whereSql}
       ORDER BY ucs.session_start_at DESC, ucs.id DESC`,
      params
    );

    return NextResponse.json(res.rows.map(mapUserCounterSessionRow));
  } catch (err) {
    console.error('[employee user counter session GET]', err.message);
    return NextResponse.json([]);
  }
}
