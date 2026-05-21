import * as XLSX from 'xlsx';
import { query } from '@/lib/db';
import { ensureSalesBillingSchema } from '@/lib/salesBillingSchema';
import { ensureCatalogExtrasSchema } from '@/lib/catalogExtrasSchema';
import { ensureStockInSchema } from '@/lib/stockInSchema';
import { ensureStockOutSchema } from '@/lib/stockOutSchema';
import { ensureInvoiceSalesOrdersSchema } from '@/lib/invoiceSalesOrdersSchema';

const REPORT_ROLES = ['super_admin', 'admin', 'manager'];

const REPORTS = {
  'orders/list-of-orders': {
    title: 'List Of Orders',
    worksheet: 'Orders',
    columns: [
      { key: 'order_id', label: 'Order ID' },
      { key: 'sales_order_id', label: 'Sales Order ID' },
      { key: 'store', label: 'Store' },
      { key: 'invoice_number', label: 'Invoice Number' },
      { key: 'order_mode', label: 'Order Mode' },
      { key: 'order_date', label: 'Order Date' },
      { key: 'order_time', label: 'Order Time' },
      { key: 'sales', label: 'Sales' },
      { key: 'discount', label: '(-) Discount' },
      { key: 'net_bill', label: '(=) Net Bill' },
      { key: 'taxes_product', label: '(+) Taxes (Product Level)' },
      { key: 'gross_bill', label: '(=) Gross Bill' },
      { key: 'payment_status', label: 'Payment Status' },
      { key: 'paid_amount', label: 'Paid Amount' },
      { key: 'unpaid_amount', label: 'Unpaid Amount' },
      { key: 'employee', label: 'Employee' },
      { key: 'invoiced_customer', label: 'Invoiced Customer Name' },
      { key: 'inv_customer_phone', label: 'Invoiced Customer Phone' },
      { key: 'payment_mode', label: 'Payment Mode' },
      { key: 'remarks', label: 'Remarks' },
    ],
  },
  'sales/daily-sales': {
    title: 'Daily Sales',
    worksheet: 'Daily Sales',
    columns: [
      { key: 'store', label: 'Store' },
      { key: 'date', label: 'Date' },
      { key: 'sales', label: 'Sales' },
      { key: 'discount', label: 'Discount' },
      { key: 'net_bill', label: 'Net Bill' },
      { key: 'taxes', label: 'Taxes' },
      { key: 'gross_bill', label: 'Gross Bill' },
      { key: 'orders', label: 'Orders' },
      { key: 'avg_order_value', label: 'Avg Order Value' },
    ],
  },
  'net-sales': {
    title: 'Net Sales',
    worksheet: 'Net Sales',
    columns: [
      { key: 'store', label: 'Store' },
      { key: 'date', label: 'Date' },
      { key: 'gross_sales', label: 'Gross Sales' },
      { key: 'discount', label: '(-) Discount' },
      { key: 'taxes', label: '(+) Taxes' },
      { key: 'net_sales', label: '(=) Net Sales' },
      { key: 'orders', label: 'Orders' },
    ],
  },
  'inventory/stock-level': {
    title: 'Stock Level',
    worksheet: 'Stock Level',
    columns: [
      { key: 'product', label: 'Product' },
      { key: 'sku', label: 'SKU' },
      { key: 'store', label: 'Store' },
      { key: 'opening_stock', label: 'Opening Stock' },
      { key: 'stock_in', label: 'Stock In' },
      { key: 'stock_out', label: 'Stock Out' },
      { key: 'current_stock', label: 'Current Stock' },
      { key: 'unit', label: 'Unit' },
      { key: 'status', label: 'Status' },
    ],
  },
};

function money(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function number(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isoDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-CA');
}

function displayTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseReportDate(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString().slice(0, 10);

  const match = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
  if (!match) return null;
  const parsed = new Date(`${match[2]} ${match[1]}, ${match[3]}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function parseDateRange(value) {
  const today = new Date().toISOString().slice(0, 10);
  if (!value) return { from: today, to: today };
  const parts = String(value).split(/\s+-\s+/);
  return {
    from: parseReportDate(parts[0]) || today,
    to: parseReportDate(parts[1] || parts[0]) || today,
  };
}

function addStoreScope({ conditions, params, user, alias = 'sb', requestedStoreId }) {
  const storeId = Number(requestedStoreId || 0) || null;
  const assignedStores = (user.assigned_stores || []).map(Number).filter(Number.isFinite);

  if (user.role === 'super_admin') {
    if (storeId) {
      params.push(storeId);
      conditions.push(`${alias}.store_id = $${params.length}`);
    }
    return;
  }

  if (storeId && assignedStores.includes(storeId)) {
    params.push(storeId);
    conditions.push(`${alias}.store_id = $${params.length}`);
    return;
  }

  if (assignedStores.length > 0) {
    params.push(assignedStores);
    conditions.push(`${alias}.store_id = ANY($${params.length}::int[])`);
    return;
  }

  conditions.push('1 = 0');
}

function addSalesFilters({ conditions, params, filters, user, alias = 'sb' }) {
  const range = parseDateRange(filters.date_range);
  params.push(range.from);
  conditions.push(`DATE(${alias}.created_at) >= $${params.length}`);
  params.push(range.to);
  conditions.push(`DATE(${alias}.created_at) <= $${params.length}`);
  addStoreScope({ conditions, params, user, alias, requestedStoreId: filters.store });

  if (filters.customer) {
    params.push(`%${String(filters.customer).trim()}%`);
    conditions.push(`(${alias}.customer_name ILIKE $${params.length} OR ${alias}.customer_mobile ILIKE $${params.length})`);
  }

  if (filters.payment_type && !['all', 'select', 'select...'].includes(String(filters.payment_type).toLowerCase())) {
    params.push(String(filters.payment_type).toLowerCase());
    conditions.push(`LOWER(${alias}.payment_mode) = $${params.length}`);
  }

  if (filters.payment_status && !['all', 'select'].includes(String(filters.payment_status).toLowerCase())) {
    params.push(String(filters.payment_status).toLowerCase());
    conditions.push(`LOWER(${alias}.status) = $${params.length}`);
  }
}

async function ensureReportSchemas() {
  await ensureStockInSchema();
  await ensureStockOutSchema();
  await ensureCatalogExtrasSchema();
  await ensureSalesBillingSchema();
  await ensureInvoiceSalesOrdersSchema();
}

export function normalizeReportKey(slug) {
  if (Array.isArray(slug)) return slug.join('/');
  return String(slug || '').replace(/^\/+|\/+$/g, '');
}

export function canAccessReports(user) {
  return REPORT_ROLES.includes(user?.role);
}

export function getReportDefinition(reportKey) {
  return REPORTS[reportKey] || null;
}

export async function getStoresForUser(user) {
  if (user.role === 'super_admin') {
    const res = await query('SELECT id, name FROM stores ORDER BY name ASC');
    return res.rows;
  }

  const assignedStores = (user.assigned_stores || []).map(Number).filter(Number.isFinite);
  if (!assignedStores.length) return [];
  const res = await query('SELECT id, name FROM stores WHERE id = ANY($1::int[]) ORDER BY name ASC', [assignedStores]);
  return res.rows;
}

export async function getReportRows(reportKey, filters = {}, user) {
  await ensureReportSchemas();

  if (reportKey === 'orders/list-of-orders') return getOrdersReport(filters, user);
  if (reportKey === 'sales/daily-sales') return getDailySalesReport(filters, user);
  if (reportKey === 'net-sales') return getNetSalesReport(filters, user);
  if (reportKey === 'inventory/stock-level') return getStockLevelReport(filters, user);

  return [];
}

async function getOrdersReport(filters, user) {
  const params = [];
  const conditions = [`sb.status IN ('paid', 'completed', 'partial', 'pending')`];
  addSalesFilters({ conditions, params, filters, user, alias: 'sb' });

  const res = await query(
    `SELECT
       sb.id,
       sb.bill_number,
       sb.created_at,
       sb.subtotal,
       sb.discount_total,
       sb.tax_total,
       sb.grand_total,
       sb.paid_amount,
       sb.balance_amount,
       sb.status,
       sb.payment_mode,
       sb.customer_name,
       sb.customer_mobile,
       sb.remarks,
       s.name AS store_name,
       u.name AS employee_name
     FROM sales_bills sb
     LEFT JOIN stores s ON s.id = sb.store_id
     LEFT JOIN users u ON u.id = sb.user_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY sb.created_at DESC
     LIMIT 1000`,
    params
  );

  return res.rows.map((row) => ({
    id: `bill-${row.id}`,
    order_id: row.id,
    sales_order_id: row.bill_number,
    store: row.store_name || 'Store',
    customer: row.customer_name || 'Walk-in Customer',
    invoice_number: row.bill_number,
    order_mode: 'POS',
    date: isoDate(row.created_at),
    order_date: isoDate(row.created_at),
    order_time: displayTime(row.created_at),
    order_log_time: displayTime(row.created_at),
    sales: money(row.subtotal),
    discount: money(row.discount_total),
    net_bill: money(number(row.subtotal) - number(row.discount_total)),
    taxes_product: money(row.tax_total),
    taxes_order: '0.00',
    gross_bill: money(row.grand_total),
    payment_status: row.status,
    paid_amount: money(row.paid_amount),
    unpaid_amount: money(row.balance_amount),
    employee: row.employee_name || '',
    invoiced_customer: row.customer_name || 'Walk-in Customer',
    original_customer: row.customer_name || 'Walk-in Customer',
    inv_customer_phone: row.customer_mobile || '',
    orig_customer_phone: row.customer_mobile || '',
    payment_mode: row.payment_mode,
    remarks: row.remarks || '',
  }));
}

async function getDailySalesReport(filters, user) {
  const params = [];
  const conditions = [`sb.status IN ('paid', 'completed')`];
  addSalesFilters({ conditions, params, filters, user, alias: 'sb' });

  const res = await query(
    `SELECT
       COALESCE(s.name, 'Store') AS store,
       DATE(sb.created_at) AS date,
       COUNT(*)::int AS orders,
       COALESCE(SUM(sb.subtotal), 0) AS sales,
       COALESCE(SUM(sb.discount_total), 0) AS discount,
       COALESCE(SUM(sb.tax_total), 0) AS taxes,
       COALESCE(SUM(sb.grand_total), 0) AS gross_bill
     FROM sales_bills sb
     LEFT JOIN stores s ON s.id = sb.store_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY s.name, DATE(sb.created_at)
     ORDER BY DATE(sb.created_at) DESC, s.name ASC`,
    params
  );

  return res.rows.map((row, index) => ({
    id: `daily-${index}`,
    store: row.store,
    date: isoDate(row.date),
    sales: money(row.sales),
    discount: money(row.discount),
    net_bill: money(number(row.sales) - number(row.discount)),
    taxes: money(row.taxes),
    gross_bill: money(row.gross_bill),
    orders: row.orders,
    avg_order_value: money(number(row.gross_bill) / Math.max(1, number(row.orders))),
  }));
}

async function getNetSalesReport(filters, user) {
  const params = [];
  const conditions = [`sb.status IN ('paid', 'completed')`];
  addSalesFilters({ conditions, params, filters, user, alias: 'sb' });

  const res = await query(
    `SELECT
       COALESCE(s.name, 'Store') AS store,
       DATE(sb.created_at) AS date,
       COUNT(*)::int AS orders,
       COALESCE(SUM(sb.subtotal), 0) AS gross_sales,
       COALESCE(SUM(sb.discount_total), 0) AS discount,
       COALESCE(SUM(sb.tax_total), 0) AS taxes,
       COALESCE(SUM(sb.grand_total), 0) AS net_sales
     FROM sales_bills sb
     LEFT JOIN stores s ON s.id = sb.store_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY s.name, DATE(sb.created_at)
     ORDER BY DATE(sb.created_at) DESC, s.name ASC`,
    params
  );

  return res.rows.map((row, index) => ({
    id: `net-${index}`,
    store: row.store,
    date: isoDate(row.date),
    gross_sales: money(row.gross_sales),
    discount: money(row.discount),
    taxes: money(row.taxes),
    net_sales: money(row.net_sales),
    orders: row.orders,
  }));
}

async function getStockLevelReport(filters, user) {
  const params = [];
  const conditions = ['COALESCE(p.is_active, TRUE) = TRUE'];
  addStoreScope({ conditions, params, user, alias: 'ps', requestedStoreId: filters.store });

  const res = await query(
    `SELECT
       p.id,
       p.name AS product,
       p.sku,
       p.unit,
       COALESCE(s.name, 'Store') AS store,
       COALESCE(stock_in_totals.qty, 0) AS stock_in,
       COALESCE(sales_totals.qty, 0) + COALESCE(manual_stock_out_totals.qty, 0) AS stock_out,
       COALESCE(ps.low_stock_value, 0) AS low_stock_value,
       COALESCE(stock_in_totals.qty, 0)
        - COALESCE(sales_totals.qty, 0)
        - COALESCE(manual_stock_out_totals.qty, 0) AS current_stock
     FROM product_saleability ps
     INNER JOIN products p ON p.id = ps.product_id
     LEFT JOIN stores s ON s.id = ps.store_id
     LEFT JOIN (
       SELECT si.destination_id AS store_id, sii.product_id, SUM(sii.qty) AS qty
       FROM stock_in_items sii
       INNER JOIN stock_in si ON si.id = sii.stock_in_id
       WHERE si.status = 'confirmed'
       GROUP BY si.destination_id, sii.product_id
     ) stock_in_totals ON stock_in_totals.store_id = ps.store_id AND stock_in_totals.product_id = p.id
     LEFT JOIN (
       SELECT sb.store_id, sbi.product_id, SUM(sbi.qty) AS qty
       FROM sales_bill_items sbi
       INNER JOIN sales_bills sb ON sb.id = sbi.sales_bill_id
       WHERE sb.status IN ('paid', 'completed')
       GROUP BY sb.store_id, sbi.product_id
     ) sales_totals ON sales_totals.store_id = ps.store_id AND sales_totals.product_id = p.id
     LEFT JOIN (
       SELECT so.destination_id AS store_id, soi.product_id, SUM(soi.qty) AS qty
       FROM stock_out_items soi
       INNER JOIN stock_out so ON so.id = soi.stock_out_id
       WHERE so.status = 'confirmed' AND COALESCE(so.reference_type, '') <> 'sales_bill'
       GROUP BY so.destination_id, soi.product_id
     ) manual_stock_out_totals ON manual_stock_out_totals.store_id = ps.store_id AND manual_stock_out_totals.product_id = p.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY current_stock ASC, p.name ASC
     LIMIT 1000`,
    params
  );

  return res.rows.map((row) => {
    const currentStock = number(row.current_stock);
    const lowStockValue = number(row.low_stock_value);
    return {
      id: `stock-${row.id}-${row.store}`,
      product: row.product,
      sku: row.sku || '',
      store: row.store,
      opening_stock: money(0),
      stock_in: number(row.stock_in),
      stock_out: number(row.stock_out),
      current_stock: currentStock,
      unit: row.unit || 'PCS',
      status: lowStockValue > 0 && currentStock <= lowStockValue ? 'Low' : currentStock <= 0 ? 'Out' : 'In Stock',
    };
  });
}

export async function getReportsDashboard(user) {
  await ensureReportSchemas();
  const today = new Date().toISOString().slice(0, 10);
  const filters = { date_range: `${today} - ${today}` };
  const [orders, dailySales, netSales, stockRows, stores] = await Promise.all([
    getOrdersReport(filters, user),
    getDailySalesReport(filters, user),
    getNetSalesReport(filters, user),
    getStockLevelReport({}, user),
    getStoresForUser(user),
  ]);

  const dailyTotal = dailySales.reduce((sum, row) => sum + number(String(row.gross_bill).replace(/,/g, '')), 0);
  const netTotal = netSales.reduce((sum, row) => sum + number(String(row.net_sales).replace(/,/g, '')), 0);
  const lowStock = stockRows.filter((row) => row.status === 'Low' || row.status === 'Out');

  return {
    stores,
    pinned: {
      orders: { value: orders.length, label: `${orders.length} orders` },
      dailySales: { value: dailyTotal, label: `₹${money(dailyTotal)}` },
      netSales: { value: netTotal, label: `₹${money(netTotal)}` },
      stockLevel: { value: stockRows.length, low: lowStock.length, label: `${stockRows.length} SKUs` },
    },
  };
}

export function createReportWorkbookBuffer(definition, rows) {
  const headers = definition.columns.map((column) => column.label);
  const body = rows.map((row) => definition.columns.map((column) => row[column.key] ?? ''));
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, definition.worksheet || definition.title || 'Report');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
