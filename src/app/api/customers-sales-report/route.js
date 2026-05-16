import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureCustomersSchema } from '@/lib/customersSchema';
import { ensureInvoiceSalesOrdersSchema } from '@/lib/invoiceSalesOrdersSchema';
import { ensureStockInSchema } from '@/lib/stockInSchema';

function parsePositiveInteger(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.trunc(number);
}

function normalizeText(value) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : '';
}

function normalizeDate(value) {
  const text = normalizeText(value);
  if (!text) return null;

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function mapCustomerSalesRow(row, index, page, pageSize) {
  return {
    sNo: (page - 1) * pageSize + index + 1,
    customerId: row.customer_id || '—',
    name: row.customer_name || '—',
    mobile: row.mobile || '—',
    email: row.email || '—',
    orders: Number(row.orders || 0),
    sales: Number(row.sales || 0),
    pointsEarned: Number(row.points_earned || 0),
    pointsBurned: Number(row.points_burned || 0),
    customerSince: row.customer_since || null,
  };
}

export async function GET(request) {
  try {
    await Promise.all([
      ensureCustomersSchema(),
      ensureInvoiceSalesOrdersSchema(),
      ensureStockInSchema(),
    ]);

    const { searchParams } = new URL(request.url);
    const page = parsePositiveInteger(searchParams.get('page'), 1);
    const pageSize = parsePositiveInteger(searchParams.get('pageSize'), 10);
    const dateFrom = normalizeDate(searchParams.get('dateFrom'));
    const dateTo = normalizeDate(searchParams.get('dateTo'));
    const store = normalizeText(searchParams.get('store'));
    const search = normalizeText(searchParams.get('search'));

    const params = [];
    const orderFilters = ["COALESCE(iso.invoice_id, '') <> ''"];

    if (dateFrom) {
      params.push(dateFrom);
      orderFilters.push(`COALESCE(iso.invoice_date, iso.booking_date, iso.auto_invoice_date, iso.created_at::date) >= $${params.length}::date`);
    }

    if (dateTo) {
      params.push(dateTo);
      orderFilters.push(`COALESCE(iso.invoice_date, iso.booking_date, iso.auto_invoice_date, iso.created_at::date) <= $${params.length}::date`);
    }

    if (store && store.toLowerCase() !== 'all') {
      params.push(store);
      orderFilters.push(`(CAST(iso.store_id AS TEXT) = $${params.length} OR LOWER(COALESCE(s.name, '')) = LOWER($${params.length}))`);
    }

    if (search) {
      params.push(`%${search}%`);
    }

    const searchClause = search
      ? `WHERE (
          COALESCE(c.customer_code, '') ILIKE $${params.length}
          OR COALESCE(TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), '') ILIKE $${params.length}
          OR COALESCE(c.mobile_number, '') ILIKE $${params.length}
          OR COALESCE(c.email_address, '') ILIKE $${params.length}
          OR COALESCE(c.id::text, '') ILIKE $${params.length}
        )`
      : '';

    const offset = (page - 1) * pageSize;
    params.push(pageSize, offset);
    const limitIndex = params.length - 1;
    const offsetIndex = params.length;
    const orderWhereSql = `WHERE ${orderFilters.join(' AND ')}`;

    const result = await query(
      `
        WITH filtered_orders AS (
          SELECT
            iso.id,
            iso.booking_id,
            iso.meta,
            COALESCE(iso.gross_bill, 0)
              + COALESCE(iso.additional_charge_value, 0)
              - COALESCE(iso.total_discount, 0)
              - COALESCE(iso.write_off_amount, 0) AS sales_amount,
            COALESCE(
              NULLIF(iso.meta->>'loyalty_earned', '')::NUMERIC,
              NULLIF(iso.meta->>'earned_points', '')::NUMERIC,
              NULLIF(iso.meta->>'points_earned', '')::NUMERIC,
              0
            ) AS loyalty_earned,
            COALESCE(
              NULLIF(iso.meta->>'loyalty_redeemed', '')::NUMERIC,
              NULLIF(iso.meta->>'points_redeemed', '')::NUMERIC,
              NULLIF(iso.meta->>'redeemed_points', '')::NUMERIC,
              0
            ) AS loyalty_redeemed
          FROM invoice_sales_orders iso
          LEFT JOIN stores s ON s.id = iso.store_id
          ${orderWhereSql}
        ),
        customer_summary AS (
          SELECT
            COALESCE(c.customer_code, c.id::TEXT) AS customer_id,
            TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')) AS customer_name,
            c.mobile_number AS mobile,
            c.email_address AS email,
            COUNT(fo.id)::INT AS orders,
            COALESCE(SUM(fo.sales_amount), 0) AS sales,
            COALESCE(NULLIF(SUM(fo.loyalty_earned), 0), c.registration_points, 0) AS points_earned,
            COALESCE(SUM(fo.loyalty_redeemed), 0) AS points_burned,
            c.created_at::DATE AS customer_since,
            COUNT(*) OVER()::INT AS total_count
          FROM customers c
          INNER JOIN filtered_orders fo ON (
            fo.booking_id = c.customer_code
            OR fo.booking_id = c.id::TEXT
            OR (fo.meta->>'customer_id') = c.id::TEXT
          )
          ${searchClause}
          GROUP BY c.id, c.customer_code, c.first_name, c.last_name, c.mobile_number, c.email_address, c.registration_points, c.created_at
        )
        SELECT *
        FROM customer_summary
        ORDER BY sales DESC, customer_name ASC, customer_id ASC
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `,
      params
    );

    const rows = result.rows || [];
    const total = rows.length > 0 ? Number(rows[0].total_count || 0) : 0;

    return NextResponse.json({
      rows: rows.map((row, index) => mapCustomerSalesRow(row, index, page, pageSize)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: total > 0 ? Math.ceil(total / pageSize) : 1,
      },
    });
  } catch (err) {
    console.error('[customers-sales-report GET]', err.message);
    return NextResponse.json(
      {
        rows: [],
        pagination: {
          page: 1,
          pageSize: 10,
          total: 0,
          totalPages: 1,
        },
        error: err.message || 'Failed to fetch customers sales report',
      },
      { status: 500 }
    );
  }
}