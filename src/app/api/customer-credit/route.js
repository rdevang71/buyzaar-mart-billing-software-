import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureCustomersSchema } from '@/lib/customersSchema';
import { ensureInvoiceSalesOrdersSchema } from '@/lib/invoiceSalesOrdersSchema';

export async function POST(request) {
  try {
    await ensureCustomersSchema();
    await ensureInvoiceSalesOrdersSchema();

    const body = await request.json().catch(() => ({}));
    const store = String(body.store || '').trim();

    const params = [];
    let storeFilterSql = '';
    if (store && store.toLowerCase() !== 'all') {
      params.push(store);
      storeFilterSql = `AND (s.name = $${params.length} OR CAST(iso.store_id AS TEXT) = $${params.length})`;
    }

    // Try to associate invoices with customers via booking_id or meta.customer_id
    const sql = `
      SELECT c.id, c.first_name || ' ' || c.last_name AS name, c.mobile_number, c.email_address, c.customer_type,
             COALESCE(SUM(iso.gross_bill + iso.additional_charge_value - iso.total_discount - COALESCE(iso.write_off_amount,0)), 0) AS amount_due
      FROM customers c
      LEFT JOIN invoice_sales_orders iso ON (
        iso.booking_id = c.customer_code OR iso.booking_id = c.id::text OR (iso.meta->>'customer_id') = c.id::text
      )
      LEFT JOIN stores s ON s.id = iso.store_id
      WHERE 1=1
      ${storeFilterSql}
      GROUP BY c.id
      ORDER BY amount_due DESC, c.id DESC
      LIMIT 100
    `;

    const res = await query(sql, params);
    const rows = res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      mobile_number: r.mobile_number,
      email_address: r.email_address,
      customer_type: r.customer_type,
      amount_due: r.amount_due ? Number(r.amount_due).toFixed(2) : '0.00',
    }));

    return NextResponse.json({ rows });
  } catch (err) {
    console.error('[customer-credit POST]', err.message);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}

export async function GET(request) {
  return NextResponse.json({ message: 'Use POST to fetch customer credit data' });
}
