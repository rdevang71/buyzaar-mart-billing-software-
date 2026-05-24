import { NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { ensureStockInSchema } from '@/lib/stockInSchema';
import { appendStoreScope, requireAuth, requirePermission, requireStore } from '@/lib/api-protection';

export async function GET(request) {
  try {
    await ensureStockInSchema();
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const permissionCheck = requirePermission(auth.user, 'VIEW_INVENTORY', 'MANAGE_INVENTORY');
    if (permissionCheck.error) return permissionCheck.error;

    const params = [];
    const whereClauses = [`s.status = 'confirmed'`];
    const scope = appendStoreScope(whereClauses, params, 's.destination_id', auth.user);
    if (scope.error) return scope.error;
    const { searchParams } = new URL(request.url);
    const search = String(searchParams.get('search') || '').trim();
    const dateFrom = String(searchParams.get('date_from') || '').trim();
    const dateTo = String(searchParams.get('date_to') || '').trim();
    const source = String(searchParams.get('source') || '').trim();

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(
        s.transaction_id ILIKE $${params.length}
        OR s.invoice_number ILIKE $${params.length}
        OR s.vendor_name ILIKE $${params.length}
        OR st.name ILIKE $${params.length}
        OR s.reference_type ILIKE $${params.length}
        OR s.reference_id ILIKE $${params.length}
      )`);
    }
    if (dateFrom) {
      params.push(dateFrom);
      whereClauses.push(`COALESCE(s.invoice_date::date, s.created_at::date) >= $${params.length}::date`);
    }
    if (dateTo) {
      params.push(dateTo);
      whereClauses.push(`COALESCE(s.invoice_date::date, s.created_at::date) <= $${params.length}::date`);
    }
    if (source) {
      params.push(source);
      whereClauses.push(`COALESCE(s.reference_type, '') = $${params.length}`);
    }

    const res = await query(
      `SELECT
        s.id,
        s.transaction_id,
        s.invoice_number,
        s.invoice_date,
        s.vendor_name,
        s.other_charges,
        s.total_items,
        s.total_cost,
        s.total_tax,
        s.reference_type,
        s.reference_id,
        s.status,
        s.created_at,
        st.name AS destination_name,
        COALESCE(SUM(si.qty), 0) AS item_qty_sum,
        COALESCE(SUM(si.qty * si.cost_price), 0) AS items_cost_sum
      FROM stock_in s
      LEFT JOIN stores st ON st.id = s.destination_id
      LEFT JOIN stock_in_items si ON si.stock_in_id = s.id
      WHERE ${whereClauses.join(' AND ')}
      GROUP BY s.id, st.name
      ORDER BY s.confirmed_at DESC NULLS LAST, s.created_at DESC
      LIMIT 200`,
      params
    );

    const records = res.rows.map((row) => {
      const totalItems = Number(row.total_items || row.item_qty_sum || 0);
      const totalCost = Number(row.total_cost || Number(row.items_cost_sum || 0) + Number(row.other_charges || 0));
      return {
        id: row.id,
        transactionId: row.transaction_id || `#STK-${String(row.id).padStart(3, '0')}`,
        invoiceNumber: row.invoice_number || '—',
        destination: row.destination_name || '—',
        invoiceDate: row.invoice_date,
        totalItems,
        cost: totalCost,
        referenceType: row.reference_type || '—',
        referenceId: row.reference_id || '—',
        vendorName: row.vendor_name,
        totalTax: Number(row.total_tax || 0),
        createdAt: row.created_at,
      };
    });

    return NextResponse.json(records);
  } catch (err) {
    console.error('[stockin GET]', err.message);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request) {
  try {
    await ensureStockInSchema();
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const permissionCheck = requirePermission(auth.user, 'MANAGE_INVENTORY');
    if (permissionCheck.error) return permissionCheck.error;

    const payload = await request.json();
    const destinationId = payload.destination ? Number(payload.destination) : null;
    if (!destinationId && auth.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Store destination is required for your account' }, { status: 403 });
    }
    if (destinationId) {
      const storeCheck = requireStore(auth.user, destinationId);
      if (storeCheck.error) return storeCheck.error;
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');
      const insertText = `
        INSERT INTO stock_in (method, destination_id, apply_taxes, add_products_prefill, meta, status, created_at)
        VALUES ($1, $2, $3, $4, $5, 'draft', NOW())
        RETURNING id`;
      const values = [
        payload.method || 'new',
        destinationId,
        payload.applyTaxes ?? true,
        payload.addProductsPrefill ?? false,
        JSON.stringify(payload),
      ];
      const res = await client.query(insertText, values);
      const id = res.rows[0].id;
      const transactionId = `STK-${String(id).padStart(4, '0')}`;
      await client.query('UPDATE stock_in SET transaction_id = $1 WHERE id = $2', [transactionId, id]);
      await client.query('COMMIT');
      return NextResponse.json({ id, transactionId }, { status: 201 });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[stockin POST]', err.message);
    return NextResponse.json({ error: 'Failed to create stock in' }, { status: 500 });
  }
}
