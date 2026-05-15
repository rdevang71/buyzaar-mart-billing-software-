import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureStockInSchema } from '@/lib/stockInSchema';
import { ensureStockOutSchema } from '@/lib/stockOutSchema';

export async function GET() {
  try {
    await ensureStockInSchema();
    await ensureStockOutSchema();
    const res = await query(
      `SELECT DISTINCT name
       FROM (
         SELECT vendor_name AS name
         FROM stock_in
         WHERE vendor_name IS NOT NULL AND vendor_name <> ''
         UNION
         SELECT vendor_name AS name
         FROM stock_out
         WHERE vendor_name IS NOT NULL AND vendor_name <> ''
       ) vendors
       ORDER BY name
       LIMIT 100`
    );
    return NextResponse.json(res.rows.map((r) => ({ name: r.name })));
  } catch {
    return NextResponse.json([]);
  }
}
