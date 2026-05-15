import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureStockInSchema } from '@/lib/stockInSchema';

export async function GET() {
  try {
    await ensureStockInSchema();
    const res = await query('SELECT id, name FROM stores ORDER BY id LIMIT 100');
    const rows = res.rows.map((r) => ({ id: r.id, name: r.name }));
    return NextResponse.json(rows);
  } catch (err) {
    console.error('[stores GET]', err.message);
    return NextResponse.json([
      { id: 1, name: 'Central Warehouse' },
      { id: 2, name: 'The Buyzaar Mart' },
      { id: 3, name: 'Outlet Store' },
    ]);
  }
}
