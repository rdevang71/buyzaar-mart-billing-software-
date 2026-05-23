import * as XLSX from 'xlsx';
import { query } from '@/lib/db';
import { ensureSalesBillingSchema } from '@/lib/salesBillingSchema';
import { ensureCatalogExtrasSchema } from '@/lib/catalogExtrasSchema';
import { ensureStockInSchema } from '@/lib/stockInSchema';
import { ensureStockOutSchema } from '@/lib/stockOutSchema';
import { ensureInvoiceSalesOrdersSchema } from '@/lib/invoiceSalesOrdersSchema';
import { ensureInventoryBatchSchema } from '@/lib/inventoryBatching';
import { ensureVendorsSchema } from '@/lib/vendorsSchema';
import { ensurePurchaseOrderSchema } from '@/lib/purchaseOrderSchema';

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
  'daily-sales-dsr': {
    title: 'Daily Sales (DSR)',
    worksheet: 'DSR',
    columns: [
      { key: 'store',     label: 'Store'     },
      { key: 'date',      label: 'Date'      },
      { key: 'orders',    label: 'Orders'    },
      { key: 'sales',     label: 'Sales'     },
      { key: 'discount',  label: 'Discount'  },
      { key: 'net_bill',  label: 'Net Bill'  },
      { key: 'taxes',     label: 'Taxes'     },
      { key: 'gross_bill',label: 'Gross Bill'},
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
      { key: 'product',       label: 'Product'       },
      { key: 'sku',           label: 'SKU'           },
      { key: 'store',         label: 'Store'         },
      { key: 'opening_stock', label: 'Opening Stock' },
      { key: 'stock_in',      label: 'Stock In'      },
      { key: 'stock_out',     label: 'Stock Out'     },
      { key: 'current_stock', label: 'Current Stock' },
      { key: 'unit',          label: 'Unit'          },
      { key: 'status',        label: 'Status'        },
    ],
  },
  'stock-level': {
    title: 'Stock Level',
    worksheet: 'Stock Level',
    columns: [
      { key: 'product',       label: 'Product'       },
      { key: 'sku',           label: 'SKU'           },
      { key: 'store',         label: 'Store'         },
      { key: 'opening_stock', label: 'Opening Stock' },
      { key: 'stock_in',      label: 'Stock In'      },
      { key: 'stock_out',     label: 'Stock Out'     },
      { key: 'current_stock', label: 'Current Stock' },
      { key: 'unit',          label: 'Unit'          },
      { key: 'status',        label: 'Status'        },
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
  await ensureInventoryBatchSchema();
  await ensureVendorsSchema();
  await ensurePurchaseOrderSchema();
}

export function normalizeReportKey(slug) {
  if (Array.isArray(slug)) return slug.join('/');
  return String(slug || '').replace(/^\/+|\/+$/g, '');
}

export function canAccessReports(user) {
  return REPORT_ROLES.includes(user?.role);
}

export function getReportDefinition(reportKey) {
  return REPORTS[reportKey] || createGenericReportDefinition(reportKey);
}

function titleFromReportKey(reportKey) {
  return normalizeReportKey(reportKey)
    .split('/')
    .pop()
    ?.split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Report';
}

function createGenericReportDefinition(reportKey, columns = null) {
  const title = titleFromReportKey(reportKey);
  const defaultColumns = columns || [
    { key: 'date', label: 'Date' },
    { key: 'store', label: 'Store' },
    { key: 'orders', label: 'Orders' },
    { key: 'items', label: 'Items' },
    { key: 'sales', label: 'Sales' },
    { key: 'discount', label: 'Discount' },
    { key: 'taxes', label: 'Taxes' },
    { key: 'gross_bill', label: 'Gross Bill' },
    { key: 'status', label: 'Status' },
  ];
  return { title, worksheet: title.slice(0, 31), columns: defaultColumns };
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
  if (reportKey === 'daily-sales-dsr') return getDailySalesReport(filters, user);
  if (reportKey === 'net-sales') return getNetSalesReport(filters, user);
  if (reportKey === 'inventory/stock-level') return getStockLevelReport(filters, user);
  if (reportKey === 'stock-level') return getStockLevelReport(filters, user);
  if (reportKey.startsWith('sales/')) return getSalesDimensionReport(reportKey, filters, user);
  if (reportKey.startsWith('orders/')) return getOrderFamilyReport(reportKey, filters, user);
  if (reportKey.startsWith('online-order/') || reportKey.startsWith('proforma-invoices/')) return getOrderFamilyReport(reportKey, filters, user);
  if (reportKey.startsWith('accounting/')) return getAccountingTaxReport(reportKey, filters, user);
  if (reportKey.startsWith('inventory/')) return getInventoryFamilyReport(reportKey, filters, user);
  if (reportKey.startsWith('purchase/')) return getPurchaseFamilyReport(reportKey, filters, user);
  if (reportKey.startsWith('promotions/')) return getPromotionsFamilyReport(reportKey, filters, user);
  if (reportKey.startsWith('insights/')) return getInsightsFamilyReport(reportKey, filters, user);
  if (reportKey.startsWith('logs/')) return getLogsFamilyReport(reportKey, filters, user);
  if (reportKey.startsWith('custom/')) return getDailySalesReport(filters, user);

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
  const range    = parseDateRange(filters.date_range);
  const fromDate = range.from;
  const toDate   = range.to;

  const params     = [];
  const conditions = ['COALESCE(p.is_active, TRUE) = TRUE'];

  // Store scope on outer product_saleability — sub-queries reference ps.store_id
  addStoreScope({ conditions, params, user, alias: 'ps', requestedStoreId: filters.store });

  if (filters.product && String(filters.product).trim()) {
    params.push(`%${String(filters.product).trim()}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR COALESCE(p.sku,'') ILIKE $${params.length})`);
  }

  // Date params — sub-queries share these positional params
  params.push(fromDate); const pFrom = params.length;
  params.push(toDate);   const pTo   = params.length;

  const res = await query(
    `SELECT
       p.id,
       p.name  AS product,
       p.sku,
       p.unit,
       COALESCE(s.name, 'Unknown Store') AS store,
       COALESCE(ps.low_stock_value, 0)   AS low_stock_value,

       -- Opening stock = all-time stock in BEFORE fromDate minus all-time stock out BEFORE fromDate
       COALESCE((
         SELECT SUM(sii.qty)
         FROM stock_in_items sii
         JOIN stock_in si ON si.id = sii.stock_in_id
         WHERE sii.product_id = p.id
           AND si.destination_id = ps.store_id
           AND si.status = 'confirmed'
           AND DATE(si.created_at) < $${pFrom}
       ), 0)
       - COALESCE((
         SELECT SUM(soi.qty)
         FROM stock_out_items soi
         JOIN stock_out so ON so.id = soi.stock_out_id
         WHERE soi.product_id = p.id
           AND so.destination_id = ps.store_id
           AND so.status = 'confirmed'
           AND DATE(so.created_at) < $${pFrom}
       ), 0)
       - COALESCE((
         SELECT SUM(sbi.qty)
         FROM sales_bill_items sbi
         JOIN sales_bills sb ON sb.id = sbi.sales_bill_id
         WHERE sbi.product_id = p.id
           AND sb.store_id = ps.store_id
           AND sb.status IN ('paid', 'completed')
           AND DATE(sb.created_at) < $${pFrom}
       ), 0) AS opening_stock,

       -- Stock In within date range
       COALESCE((
         SELECT SUM(sii.qty)
         FROM stock_in_items sii
         JOIN stock_in si ON si.id = sii.stock_in_id
         WHERE sii.product_id = p.id
           AND si.destination_id = ps.store_id
           AND si.status = 'confirmed'
           AND DATE(si.created_at) BETWEEN $${pFrom} AND $${pTo}
       ), 0) AS stock_in,

       -- Stock Out within date range (manual stock_out + sales)
       COALESCE((
         SELECT SUM(soi.qty)
         FROM stock_out_items soi
         JOIN stock_out so ON so.id = soi.stock_out_id
         WHERE soi.product_id = p.id
           AND so.destination_id = ps.store_id
           AND so.status = 'confirmed'
           AND DATE(so.created_at) BETWEEN $${pFrom} AND $${pTo}
       ), 0)
       + COALESCE((
         SELECT SUM(sbi.qty)
         FROM sales_bill_items sbi
         JOIN sales_bills sb ON sb.id = sbi.sales_bill_id
         WHERE sbi.product_id = p.id
           AND sb.store_id = ps.store_id
           AND sb.status IN ('paid', 'completed')
           AND DATE(sb.created_at) BETWEEN $${pFrom} AND $${pTo}
       ), 0) AS stock_out

     FROM product_saleability ps
     INNER JOIN products p ON p.id = ps.product_id
     LEFT  JOIN stores s ON s.id = ps.store_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY p.name ASC, s.name ASC
     LIMIT 1000`,
    params
  );

  return res.rows.map((row) => {
    const opening       = number(row.opening_stock);
    const stockIn       = number(row.stock_in);
    const stockOut      = number(row.stock_out);
    const currentStock  = opening + stockIn - stockOut;
    const lowStockValue = number(row.low_stock_value);
    return {
      id:            `stock-${row.id}-${row.store}`,
      product:       row.product,
      sku:           row.sku || '',
      store:         row.store,
      opening_stock: opening,
      stock_in:      stockIn,
      stock_out:     stockOut,
      current_stock: currentStock,
      unit:          row.unit || 'PCS',
      status:        lowStockValue > 0 && currentStock <= lowStockValue
                       ? 'Low'
                       : currentStock <= 0 ? 'Out' : 'In Stock',
    };
  });
}

async function getSalesDimensionReport(reportKey, filters, user) {
  if (reportKey.includes('daily-payment-breakup')) return getDailyPaymentBreakupReport(filters, user);
  if (reportKey.includes('store-hourly')) return getStoreHourlySalesReport(filters, user);

  const params = [];
  const conditions = [`sb.status IN ('paid', 'completed')`];
  addSalesFilters({ conditions, params, filters, user, alias: 'sb' });

  let dimensionSql = 'COALESCE(s.name, \'Store\')';
  let dimensionAlias = 'store';
  let joins = '';

  if (reportKey.includes('product-wise') || reportKey.includes('store-wise-product') || reportKey.includes('employee-wise-product')) {
    dimensionSql = 'COALESCE(p.name, sbi.product_name, \'Product\')';
    dimensionAlias = 'product';
  } else if (reportKey.includes('customer-wise')) {
    dimensionSql = 'COALESCE(NULLIF(sb.customer_name, \'\'), \'Walk-in Customer\')';
    dimensionAlias = 'customer';
  } else if (reportKey.includes('employee-wise')) {
    dimensionSql = 'COALESCE(u.name, \'Unassigned\')';
    dimensionAlias = 'employee';
  } else if (reportKey.includes('brand-wise')) {
    dimensionSql = 'COALESCE(b.name, \'Unbranded\')';
    dimensionAlias = 'brand';
    joins += ' LEFT JOIN brands b ON b.id = p.brand_id';
  } else if (reportKey.includes('category-wise')) {
    dimensionSql = 'COALESCE(c.name, \'Uncategorised\')';
    dimensionAlias = 'category';
    joins += ' LEFT JOIN categories c ON c.id = p.category_id';
  } else if (reportKey.includes('sub-category')) {
    dimensionSql = 'COALESCE(sc.name, \'No Sub Category\')';
    dimensionAlias = 'sub_category';
    joins += ' LEFT JOIN sub_categories sc ON sc.id = p.sub_category_id';
  } else if (reportKey.includes('department-wise')) {
    dimensionSql = 'COALESCE(d.name, \'No Department\')';
    dimensionAlias = 'department';
    joins += ' LEFT JOIN departments d ON d.id = p.department_id';
  } else if (reportKey.includes('income-head')) {
    dimensionSql = 'COALESCE(ih.name, \'No Income Head\')';
    dimensionAlias = 'income_head';
    joins += ' LEFT JOIN income_heads ih ON ih.id = p.income_head_id';
  } else if (reportKey.includes('location') || reportKey.includes('region') || reportKey.includes('entity') || reportKey.includes('device') || reportKey.includes('fiscal')) {
    dimensionSql = 'COALESCE(s.name, \'Store\')';
    dimensionAlias = reportKey.includes('region') ? 'region' : reportKey.includes('device') ? 'device' : 'store';
  }

  const res = await query(
    `SELECT
       ${dimensionSql} AS dimension,
       COALESCE(s.name, 'Store') AS store,
       DATE(sb.created_at) AS date,
       COUNT(DISTINCT sb.id)::int AS orders,
       COALESCE(SUM(sbi.qty), 0) AS items,
       COALESCE(SUM(sbi.qty * sbi.selling_price), 0) AS sales,
       COALESCE(SUM(sbi.discount_amount), 0) AS discount,
       COALESCE(SUM(sbi.tax_amount), 0) AS taxes,
       COALESCE(SUM(sbi.line_total), 0) AS gross_bill
     FROM sales_bills sb
     LEFT JOIN sales_bill_items sbi ON sbi.sales_bill_id = sb.id
     LEFT JOIN products p ON p.id = sbi.product_id
     LEFT JOIN stores s ON s.id = sb.store_id
     LEFT JOIN users u ON u.id = sb.user_id
     ${joins}
     WHERE ${conditions.join(' AND ')}
     GROUP BY ${dimensionSql}, COALESCE(s.name, 'Store'), DATE(sb.created_at)
     ORDER BY gross_bill DESC, date DESC
     LIMIT 1000`,
    params
  );

  return res.rows.map((row, index) => ({
    id: `sales-${reportKey}-${index}`,
    [dimensionAlias]: row.dimension,
    product: row.dimension,
    category: row.dimension,
    brand: row.dimension,
    department: row.dimension,
    employee: row.dimension,
    customer: row.dimension,
    store: row.store,
    date: isoDate(row.date),
    orders: row.orders,
    items: number(row.items),
    quantity: number(row.items),
    sales: money(row.sales),
    discount: money(row.discount),
    net_bill: money(number(row.sales) - number(row.discount)),
    taxes: money(row.taxes),
    gross_bill: money(row.gross_bill),
    avg_order_value: money(number(row.gross_bill) / Math.max(1, number(row.orders))),
    margin: money(0),
    profit: money(0),
  }));
}

async function getDailyPaymentBreakupReport(filters, user) {
  const params = [];
  const conditions = [`sb.status IN ('paid', 'completed')`];
  addSalesFilters({ conditions, params, filters, user, alias: 'sb' });
  const res = await query(
    `SELECT DATE(sb.created_at) AS date, COALESCE(s.name, 'Store') AS store,
            COALESCE(NULLIF(sb.payment_mode, ''), 'cash') AS payment_mode,
            COUNT(*)::int AS orders, COALESCE(SUM(sb.grand_total), 0) AS amount
     FROM sales_bills sb
     LEFT JOIN stores s ON s.id = sb.store_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY DATE(sb.created_at), s.name, sb.payment_mode
     ORDER BY date DESC, store ASC`,
    params
  );
  return res.rows.map((row, index) => ({
    id: `payment-${index}`,
    date: isoDate(row.date),
    store: row.store,
    payment_mode: row.payment_mode,
    orders: row.orders,
    amount: money(row.amount),
    sales: money(row.amount),
    gross_bill: money(row.amount),
  }));
}

async function getStoreHourlySalesReport(filters, user) {
  const params = [];
  const conditions = [`sb.status IN ('paid', 'completed')`];
  addSalesFilters({ conditions, params, filters, user, alias: 'sb' });
  const res = await query(
    `SELECT COALESCE(s.name, 'Store') AS store,
            DATE(sb.created_at) AS date,
            EXTRACT(HOUR FROM sb.created_at)::int AS hour,
            COUNT(*)::int AS orders,
            COALESCE(SUM(sb.grand_total), 0) AS gross_bill
     FROM sales_bills sb
     LEFT JOIN stores s ON s.id = sb.store_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY s.name, DATE(sb.created_at), EXTRACT(HOUR FROM sb.created_at)
     ORDER BY date DESC, store ASC, hour ASC`,
    params
  );
  return res.rows.map((row, index) => ({
    id: `hourly-${index}`,
    store: row.store,
    date: isoDate(row.date),
    hour: `${String(row.hour).padStart(2, '0')}:00`,
    orders: row.orders,
    sales: money(row.gross_bill),
    gross_bill: money(row.gross_bill),
    avg_order_value: money(number(row.gross_bill) / Math.max(1, number(row.orders))),
  }));
}

async function getOrderFamilyReport(reportKey, filters, user) {
  if (reportKey.includes('product-in') || reportKey.includes('product-transaction')) return getProductInOrdersReport(filters, user);
  if (reportKey.includes('payment')) return getOrderPaymentReport(filters, user);
  if (reportKey.includes('void')) {
    const next = { ...filters, payment_status: 'void' };
    return getOrdersReport(next, user);
  }
  return getOrdersReport(filters, user);
}

async function getProductInOrdersReport(filters, user) {
  const params = [];
  const conditions = [`sb.status IN ('paid', 'completed', 'partial', 'pending')`];
  addSalesFilters({ conditions, params, filters, user, alias: 'sb' });
  if (filters.product) {
    params.push(`%${String(filters.product).trim()}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR COALESCE(p.sku, '') ILIKE $${params.length})`);
  }
  const res = await query(
    `SELECT sb.id AS order_id, sb.bill_number, sb.created_at, sb.payment_mode, sb.status,
            COALESCE(s.name, 'Store') AS store,
            COALESCE(p.name, sbi.product_name, 'Product') AS product,
            COALESCE(p.sku, sbi.sku, '') AS sku,
            sbi.qty, sbi.selling_price, sbi.discount_amount, sbi.tax_amount, sbi.line_total
     FROM sales_bill_items sbi
     INNER JOIN sales_bills sb ON sb.id = sbi.sales_bill_id
     LEFT JOIN products p ON p.id = sbi.product_id
     LEFT JOIN stores s ON s.id = sb.store_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY sb.created_at DESC, sb.id DESC
     LIMIT 1000`,
    params
  );
  return res.rows.map((row) => ({
    id: `order-product-${row.order_id}-${row.sku}`,
    order_id: row.order_id,
    sales_order_id: row.bill_number,
    invoice_number: row.bill_number,
    store: row.store,
    date: isoDate(row.created_at),
    order_date: isoDate(row.created_at),
    order_time: displayTime(row.created_at),
    product: row.product,
    sku: row.sku,
    qty: number(row.qty),
    quantity: number(row.qty),
    rate: money(row.selling_price),
    sales: money(number(row.qty) * number(row.selling_price)),
    discount: money(row.discount_amount),
    taxes: money(row.tax_amount),
    gross_bill: money(row.line_total),
    payment_mode: row.payment_mode,
    status: row.status,
  }));
}

async function getOrderPaymentReport(filters, user) {
  const params = [];
  const conditions = [`sb.status IN ('paid', 'completed', 'partial', 'pending')`];
  addSalesFilters({ conditions, params, filters, user, alias: 'sb' });
  const res = await query(
    `SELECT sb.id, sb.bill_number, sb.created_at, sb.payment_mode, sb.status,
            sb.grand_total, sb.paid_amount, sb.balance_amount,
            COALESCE(s.name, 'Store') AS store,
            sb.customer_name, sb.customer_mobile
     FROM sales_bills sb
     LEFT JOIN stores s ON s.id = sb.store_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY sb.created_at DESC
     LIMIT 1000`,
    params
  );
  return res.rows.map((row) => ({
    id: `order-pay-${row.id}`,
    order_id: row.id,
    sales_order_id: row.bill_number,
    invoice_number: row.bill_number,
    date: isoDate(row.created_at),
    order_date: isoDate(row.created_at),
    order_time: displayTime(row.created_at),
    store: row.store,
    customer: row.customer_name || 'Walk-in Customer',
    customer_mobile: row.customer_mobile || '',
    payment_mode: row.payment_mode,
    payment_status: row.status,
    amount: money(row.grand_total),
    paid_amount: money(row.paid_amount || row.grand_total),
    unpaid_amount: money(row.balance_amount),
    gross_bill: money(row.grand_total),
    status: row.status,
  }));
}

async function getAccountingTaxReport(reportKey, filters, user) {
  const params = [];
  const conditions = [`sb.status IN ('paid', 'completed')`];
  addSalesFilters({ conditions, params, filters, user, alias: 'sb' });
  const groupExpr = reportKey.includes('hsn')
    ? `COALESCE(t.hsn_code, 'NA')`
    : reportKey.includes('order-wise')
      ? `sb.bill_number`
      : `COALESCE(p.name, sbi.product_name, 'Product')`;
  const res = await query(
    `SELECT ${groupExpr} AS group_name,
            COALESCE(s.name, 'Store') AS store,
            DATE(sb.created_at) AS date,
            COUNT(DISTINCT sb.id)::int AS orders,
            COALESCE(SUM(sbi.line_total - sbi.tax_amount), 0) AS taxable_amount,
            COALESCE(SUM(sbi.tax_amount), 0) AS tax,
            COALESCE(SUM(sbi.line_total), 0) AS gross_bill
     FROM sales_bill_items sbi
     INNER JOIN sales_bills sb ON sb.id = sbi.sales_bill_id
     LEFT JOIN products p ON p.id = sbi.product_id
     LEFT JOIN taxes t ON t.id = p.tax_id
     LEFT JOIN stores s ON s.id = sb.store_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY ${groupExpr}, s.name, DATE(sb.created_at)
     ORDER BY date DESC, tax DESC
     LIMIT 1000`,
    params
  );
  return res.rows.map((row, index) => ({
    id: `tax-${index}`,
    hsn_sac: row.group_name,
    product: row.group_name,
    order_id: row.group_name,
    invoice_number: row.group_name,
    store: row.store,
    date: isoDate(row.date),
    orders: row.orders,
    taxable_amount: money(row.taxable_amount),
    tax: money(row.tax),
    taxes: money(row.tax),
    cgst: money(number(row.tax) / 2),
    sgst: money(number(row.tax) / 2),
    gross_bill: money(row.gross_bill),
  }));
}

async function getInventoryFamilyReport(reportKey, filters, user) {
  if (reportKey.includes('low-stock')) {
    const rows = await getStockLevelReport(filters, user);
    return rows.filter((row) => row.status === 'Low' || row.status === 'Out');
  }
  if (reportKey.includes('stock-movement') || reportKey.includes('stock-operations') || reportKey.includes('ledger')) {
    return getStockMovementReport(filters, user);
  }
  if (reportKey.includes('store-wise') || reportKey.includes('product-group') || reportKey.includes('ageing') || reportKey.includes('profit-margin')) {
    return getStockLevelReport(filters, user);
  }
  return getStockLevelReport(filters, user);
}

async function getStockMovementReport(filters, user) {
  const range = parseDateRange(filters.date_range);
  const assignedStores = (user.assigned_stores || []).map(Number).filter(Number.isFinite);
  const params = [range.from, range.to];
  let storeClause = '';
  if (user.role !== 'super_admin') {
    if (!assignedStores.length) return [];
    params.push(assignedStores);
    storeClause = ` AND m.store_id = ANY($${params.length}::int[])`;
  } else if (filters.store && filters.store !== 'all') {
    params.push(Number(filters.store));
    storeClause = ` AND m.store_id = $${params.length}`;
  }
  const res = await query(
    `SELECT m.*, COALESCE(p.name, 'Product') AS product, p.sku, COALESCE(s.name, 'Store') AS store
     FROM inventory_batch_movements m
     LEFT JOIN products p ON p.id = m.product_id
     LEFT JOIN stores s ON s.id = m.store_id
     WHERE DATE(m.created_at) BETWEEN $1 AND $2 ${storeClause}
     ORDER BY m.created_at DESC
     LIMIT 1000`,
    params
  );
  return res.rows.map((row) => ({
    id: `movement-${row.id}`,
    date: isoDate(row.created_at),
    time: displayTime(row.created_at),
    product: row.product,
    sku: row.sku || '',
    store: row.store,
    direction: row.direction,
    qty: number(row.qty),
    quantity: number(row.qty),
    reference_type: row.reference_type || '',
    reference_id: row.reference_id || '',
    status: row.direction === 'in' ? 'Stock In' : 'Stock Out',
  }));
}

async function getPurchaseFamilyReport(reportKey, filters, user) {
  await ensureStockInSchema();
  await ensureVendorsSchema();
  await ensurePurchaseOrderSchema();
  const range = parseDateRange(filters.date_range);
  const params = [range.from, range.to];
  const poConditions = [`DATE(COALESCE(po.confirmed_at, po.created_at)) BETWEEN $1 AND $2`];
  const stockConditions = [`DATE(COALESCE(si.confirmed_at, si.created_at)) BETWEEN $1 AND $2`];
  const requestedStoreId = Number(filters.store || 0) || null;
  const assignedStores = (user.assigned_stores || []).map(Number).filter(Number.isFinite);
  if (user.role === 'super_admin') {
    if (requestedStoreId) {
      params.push(requestedStoreId);
      poConditions.push(`po.destination_id = $${params.length}`);
      stockConditions.push(`si.destination_id = $${params.length}`);
    }
  } else if (requestedStoreId && assignedStores.includes(requestedStoreId)) {
    params.push(requestedStoreId);
    poConditions.push(`po.destination_id = $${params.length}`);
    stockConditions.push(`si.destination_id = $${params.length}`);
  } else if (assignedStores.length) {
    params.push(assignedStores);
    poConditions.push(`po.destination_id = ANY($${params.length}::int[])`);
    stockConditions.push(`si.destination_id = ANY($${params.length}::int[])`);
  } else {
    poConditions.push('1 = 0');
    stockConditions.push('1 = 0');
  }
  const productJoin = reportKey.includes('product') || reportKey.includes('details');
  const res = await query(
    `SELECT *
     FROM (
       SELECT
         po.id,
         po.transaction_id,
         po.invoice_number,
         po.invoice_date,
         COALESCE(v.name, 'Vendor') AS vendor_name,
         po.vendor_id,
         po.total_items,
         po.total_cost,
         po.total_tax,
         po.status,
         COALESCE(po.confirmed_at, po.created_at) AS created_at,
         COALESCE(s.name, 'Store') AS store,
         'purchase_order' AS source_type
         ${productJoin ? `, COALESCE(p.name, poi.product_name, 'Product') AS product, p.sku, poi.qty, poi.cost_price, poi.tax_value` : ''}
       FROM purchase_orders po
       LEFT JOIN vendors v ON v.id = po.vendor_id
       LEFT JOIN stores s ON s.id = po.destination_id
       ${productJoin ? 'LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id LEFT JOIN products p ON p.id = poi.product_id' : ''}
       WHERE ${poConditions.join(' AND ')}

       UNION ALL

       SELECT
         si.id,
         si.transaction_id,
         si.invoice_number,
         si.invoice_date,
         COALESCE(v.name, NULLIF(si.vendor_name, ''), 'Vendor') AS vendor_name,
         si.vendor_id,
         si.total_items,
         si.total_cost,
         si.total_tax,
         si.status,
         COALESCE(si.confirmed_at, si.created_at) AS created_at,
         COALESCE(s.name, 'Store') AS store,
         'stock_in' AS source_type
         ${productJoin ? `, COALESCE(p.name, sii.product_name, 'Product') AS product, p.sku, sii.qty, sii.cost_price, sii.tax_value` : ''}
       FROM stock_in si
       LEFT JOIN vendors v ON v.id = si.vendor_id OR LOWER(v.name) = LOWER(COALESCE(si.vendor_name, ''))
       LEFT JOIN stores s ON s.id = si.destination_id
       ${productJoin ? 'LEFT JOIN stock_in_items sii ON sii.stock_in_id = si.id LEFT JOIN products p ON p.id = sii.product_id' : ''}
       WHERE ${stockConditions.join(' AND ')}
         AND COALESCE(si.reference_type, '') <> 'purchase_order'
     ) purchases
     ORDER BY created_at DESC
     LIMIT 1000`,
    params
  );
  return res.rows.map((row, index) => ({
    id: `purchase-${row.id}-${index}`,
    po_id: row.transaction_id || row.id,
    purchase_order_id: row.transaction_id || row.id,
    vendor: row.vendor_name || 'Vendor',
    store: row.store,
    date: isoDate(row.invoice_date || row.created_at),
    invoice_number: row.invoice_number || '',
    product: row.product || '',
    sku: row.sku || '',
    qty: number(row.qty || row.total_items),
    items: number(row.total_items || row.qty),
    rate: money(row.cost_price),
    total_amount: money(row.total_cost || (number(row.qty) * number(row.cost_price))),
    tax: money(row.total_tax || row.tax_value),
    grand_total: money(number(row.total_cost || (number(row.qty) * number(row.cost_price))) + number(row.total_tax || row.tax_value)),
    status: row.status,
  }));
}

async function getPromotionsFamilyReport(filters, user) {
  const params = [];
  const conditions = [`sb.status IN ('paid', 'completed')`, `COALESCE(sb.discount_total, 0) > 0`];
  addSalesFilters({ conditions, params, filters, user, alias: 'sb' });
  const res = await query(
    `SELECT sb.id, sb.bill_number, sb.created_at, sb.discount_total, sb.grand_total,
            COALESCE(s.name, 'Store') AS store, sb.customer_name
     FROM sales_bills sb
     LEFT JOIN stores s ON s.id = sb.store_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY sb.created_at DESC
     LIMIT 1000`,
    params
  );
  return res.rows.map((row) => ({
    id: `promo-${row.id}`,
    order_id: row.id,
    invoice_number: row.bill_number,
    date: isoDate(row.created_at),
    store: row.store,
    customer: row.customer_name || 'Walk-in Customer',
    coupon: '',
    membership: '',
    discount: money(row.discount_total),
    discount_amount: money(row.discount_total),
    sales: money(row.grand_total),
    gross_bill: money(row.grand_total),
    status: 'Applied',
  }));
}

async function getInsightsFamilyReport(reportKey, filters, user) {
  if (reportKey.includes('dead-stock') || reportKey.includes('stockout') || reportKey.includes('smart-reorder')) {
    const rows = await getStockLevelReport(filters, user);
    return rows
      .filter((row) => reportKey.includes('dead-stock') ? number(row.current_stock) > 0 : number(row.current_stock) <= 0 || row.status === 'Low')
      .map((row) => ({
        ...row,
        risk: row.status === 'Out' ? 'High' : row.status === 'Low' ? 'Medium' : 'Low',
        recommendation: row.status === 'Out' ? 'Reorder immediately' : row.status === 'Low' ? 'Plan reorder' : 'Review movement',
      }));
  }
  if (reportKey.includes('basket')) return getProductInOrdersReport(filters, user);
  if (reportKey.includes('purchase-price')) return getPurchaseFamilyReport('purchase/product-in-purchase-orders', filters, user);
  return getSalesDimensionReport('sales/product-wise-sales', filters, user);
}

async function getLogsFamilyReport(reportKey, filters, user) {
  if (reportKey.includes('product')) {
    const res = await query(
      `SELECT p.id, p.name, p.sku, p.updated_at
       FROM products p
       ORDER BY p.updated_at DESC NULLS LAST, p.id DESC
       LIMIT 1000`
    );
    return res.rows.map((row) => ({
      id: `product-log-${row.id}`,
      date: isoDate(row.updated_at),
      time: displayTime(row.updated_at),
      product: row.name,
      sku: row.sku || '',
      action: 'Updated',
      employee: '',
      status: 'Logged',
    }));
  }
  const rows = await getOrdersReport(filters, user);
  return rows.map((row) => ({
    ...row,
    action: reportKey.includes('sync') ? 'Synced' : 'System activity',
    status: row.payment_status || 'Logged',
  }));
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
