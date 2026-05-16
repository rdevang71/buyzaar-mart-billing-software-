import { query } from '@/lib/db';
import { ensureInvoiceSalesOrdersSchema } from '@/lib/invoiceSalesOrdersSchema';

const VIEW_FILTER_SQL = {
  'invoice-sales-order': "(iso.invoice_id IS NOT NULL OR LOWER(COALESCE(iso.status, '')) LIKE 'invoiced%')",
  'uninvoiced-sales-order': "(iso.invoice_id IS NULL OR LOWER(COALESCE(iso.status, '')) NOT LIKE 'invoiced%')",
  'bulk-sales-order': "(LOWER(COALESCE(iso.sales_order_type, '')) LIKE 'bulk%' OR LOWER(COALESCE(iso.status, '')) LIKE 'bulk%')",
  'invoice-conversion-tracker': "(iso.invoice_id IS NOT NULL OR iso.converted_by IS NOT NULL OR iso.converted_at IS NOT NULL)",
  'write-off': "(LOWER(COALESCE(iso.status, '')) LIKE 'written off%' OR iso.write_off_amount > 0)",
  'quotation-pending-approval': "(LOWER(COALESCE(iso.status, '')) LIKE 'quotation pending approval%' OR (iso.quotation_id IS NOT NULL AND iso.invoice_id IS NULL))",
  'auto-invoice': "(iso.auto_invoice_id IS NOT NULL OR LOWER(COALESCE(iso.status, '')) LIKE 'auto invoice%')",
};

const VIEW_LABELS = {
  'invoice-sales-order': 'Invoice Sales Order',
  'uninvoiced-sales-order': 'Uninvoiced Sales Order',
  'bulk-sales-order': 'Bulk Sales Order',
  'invoice-conversion-tracker': 'Invoice Conversion Tracker',
  'write-off': 'Write Off',
  'quotation-pending-approval': 'Quotation Pending Approval',
  'auto-invoice': 'Auto Invoice',
};

function normalizeView(view) {
  const normalized = String(view || '').trim().toLowerCase();
  return VIEW_FILTER_SQL[normalized] ? normalized : 'invoice-sales-order';
}

function parseDatePart(value) {
  if (!value) return null;
  const date = new Date(String(value).trim());
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function parseDateRange(dateRange) {
  if (!dateRange) return null;

  const text = String(dateRange).trim();
  if (!text || text.toLowerCase() === 'all') return null;

  const parts = text.split(' - ').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 1) {
    const single = parseDatePart(parts[0]);
    return single ? { start: single, end: single } : null;
  }

  if (parts.length >= 2) {
    const start = parseDatePart(parts[0]);
    const end = parseDatePart(parts[1]);
    if (start && end) return { start, end };
  }

  return null;
}

function normalizeStoreFilter(stores) {
  const text = String(stores || '').trim();
  if (!text || /^all$/i.test(text) || /regions?\s*&\s*stores?/i.test(text)) {
    return null;
  }

  return text;
}

function normalizeIds(ids) {
  if (!Array.isArray(ids)) return [];

  return ids
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function mapSalesOrderRow(row) {
  return {
    id: row.id,
    sales_order_id: row.sales_order_id,
    sales_order_type: row.sales_order_type || '',
    booking_id: row.booking_id,
    booking_date: row.booking_date,
    billing_username: row.billing_username || row.billing_name || '',
    created_by: row.created_by || '',
    submitted_date: row.submitted_date,
    approver: row.approver || '',
    gross_bill: row.gross_bill,
    additional_charge_value: row.additional_charge_value,
    total_discount: row.total_discount,
    tds_rate: row.tds_rate,
    tds_value: row.tds_value,
    tcs_rate: row.tcs_rate,
    tcs_value: row.tcs_value,
    quotation_id: row.quotation_id || '',
    invoice_id: row.invoice_id || '',
    invoice_date: row.invoice_date,
    auto_invoice_id: row.auto_invoice_id || '',
    auto_invoice_date: row.auto_invoice_date,
    write_off_amount: row.write_off_amount,
    write_off_reason: row.write_off_reason || '',
    written_off_by: row.written_off_by || '',
    written_off_date: row.written_off_date,
    converted_by: row.converted_by || '',
    converted_at: row.converted_at,
    status: row.status,
    channel: row.channel || '',
    store_id: row.store_id,
    store_name: row.store_name || '',
  };
}

export async function listSalesOrderRows(view, request) {
  await ensureInvoiceSalesOrdersSchema();

  const url = request instanceof Request ? new URL(request.url) : new URL(String(request || 'http://localhost'));
  const normalizedView = normalizeView(view);
  const dateRange = parseDateRange(url.searchParams.get('dateRange'));
  const storeFilter = normalizeStoreFilter(url.searchParams.get('stores'));

  const whereClauses = [VIEW_FILTER_SQL[normalizedView]];
  const params = [];

  if (dateRange) {
    params.push(dateRange.start, dateRange.end);
    whereClauses.push(`COALESCE(iso.invoice_date, iso.booking_date, iso.created_at::date) BETWEEN $${params.length - 1}::date AND $${params.length}::date`);
  }

  if (storeFilter) {
    params.push(storeFilter);
    whereClauses.push(`(s.name = $${params.length} OR CAST(iso.store_id AS TEXT) = $${params.length})`);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
  const res = await query(
    `SELECT iso.id,
            iso.sales_order_id,
            iso.sales_order_type,
            iso.booking_id,
            iso.booking_date,
            COALESCE(iso.billing_username, u.name) AS billing_username,
            iso.created_by,
            iso.submitted_date,
            iso.approver,
            iso.gross_bill,
            iso.additional_charge_value,
            iso.total_discount,
            iso.tds_rate,
            iso.tds_value,
            iso.tcs_rate,
            iso.tcs_value,
            iso.quotation_id,
            iso.invoice_id,
            iso.invoice_date,
            iso.auto_invoice_id,
            iso.auto_invoice_date,
            iso.write_off_amount,
            iso.write_off_reason,
            iso.written_off_by,
            iso.written_off_date,
            iso.converted_by,
            iso.converted_at,
            iso.status,
            iso.channel,
            iso.store_id,
            s.name AS store_name
     FROM invoice_sales_orders iso
     LEFT JOIN users u ON u.id = iso.billing_user_id
     LEFT JOIN stores s ON s.id = iso.store_id
     ${whereSql}
     ORDER BY COALESCE(iso.invoice_date, iso.booking_date, iso.created_at::date) DESC, iso.id DESC`,
    params
  );

  return res.rows.map(mapSalesOrderRow);
}

function buildBulkActionUpdate(action) {
  const normalizedAction = String(action || '').trim().toLowerCase();

  if (normalizedAction === 'create invoice') {
    return {
      status: 'Invoiced',
      extraSql: `invoice_id = COALESCE(NULLIF(invoice_id, ''), 'INV-' || id::text),
                 invoice_date = COALESCE(invoice_date, CURRENT_DATE),
                 converted_by = COALESCE(NULLIF(converted_by, ''), 'System'),
                 converted_at = COALESCE(converted_at, NOW())`,
    };
  }

  if (normalizedAction === 'write off') {
    return {
      status: 'Written Off',
      extraSql: `write_off_amount = COALESCE(NULLIF(write_off_amount, 0), GREATEST(gross_bill - total_discount, 0)),
                 write_off_reason = COALESCE(NULLIF(write_off_reason, ''), 'Bulk write off'),
                 written_off_by = COALESCE(NULLIF(written_off_by, ''), 'System'),
                 written_off_date = COALESCE(written_off_date, CURRENT_DATE)`,
    };
  }

  if (normalizedAction === 'auto invoice') {
    return {
      status: 'Auto Invoiced',
      extraSql: `auto_invoice_id = COALESCE(NULLIF(auto_invoice_id, ''), 'AUTO-' || id::text),
                 auto_invoice_date = COALESCE(auto_invoice_date, CURRENT_DATE),
                 converted_by = COALESCE(NULLIF(converted_by, ''), 'System'),
                 converted_at = COALESCE(converted_at, NOW())`,
    };
  }

  if (normalizedAction === 'approve quotation') {
    return {
      status: 'Quotation Approved',
      extraSql: `approver = COALESCE(NULLIF(approver, ''), 'System'),
                 submitted_date = COALESCE(submitted_date, CURRENT_DATE)`,
    };
  }

  if (normalizedAction === 'reject quotation') {
    return {
      status: 'Quotation Rejected',
      extraSql: `approver = COALESCE(NULLIF(approver, ''), 'System')`,
    };
  }

  return null;
}

export async function applySalesOrderBulkAction(view, request) {
  await ensureInvoiceSalesOrdersSchema();

  const body = await request.json();
  const ids = normalizeIds(body.ids || body.selectedRowIds || []);
  const action = String(body.action || '').trim();
  const normalizedView = normalizeView(view);

  if (ids.length === 0) {
    return { error: 'At least one sales order is required', status: 400 };
  }

  const update = buildBulkActionUpdate(action);
  if (!update) {
    return { error: 'Unsupported bulk action', status: 400 };
  }

  const res = await query(
    `UPDATE invoice_sales_orders
     SET status = $1,
         ${update.extraSql},
         updated_at = NOW()
     WHERE id = ANY($2::bigint[])
     RETURNING id,
               sales_order_id,
               sales_order_type,
               booking_id,
               booking_date,
               billing_username,
               created_by,
               submitted_date,
               approver,
               gross_bill,
               additional_charge_value,
               total_discount,
               tds_rate,
               tds_value,
               tcs_rate,
               tcs_value,
               quotation_id,
               invoice_id,
               invoice_date,
               auto_invoice_id,
               auto_invoice_date,
               write_off_amount,
               write_off_reason,
               written_off_by,
               written_off_date,
               converted_by,
               converted_at,
               status,
               channel,
               store_id`,
    [update.status, ids]
  );

  return {
    success: true,
    updatedCount: res.rowCount,
    rows: res.rows.map(mapSalesOrderRow),
    view: normalizedView,
  };
}

export function getSalesOrderViewLabel(view) {
  return VIEW_LABELS[normalizeView(view)];
}
