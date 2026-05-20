import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { verifyToken } from '@/lib/auth-enhanced';
import { ensureCustomersSchema } from '@/lib/customersSchema';
import { ensureSalesBillingSchema } from '@/lib/salesBillingSchema';

export async function GET(req) {
  try {
    // Try to get token from Authorization header or cookies
    let token = req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // Try to get from cookies (for client-side requests)
      token = req.cookies.get('access_token')?.value ||
              req.cookies.get('auth_token')?.value ||
              req.cookies.get('token')?.value;
    }
    
    if (!token) return errorResponse('Unauthorized', 401);

    const user = verifyToken(token);
    if (!user) return errorResponse('Invalid token', 401);
    await ensureCustomersSchema();
    await ensureSalesBillingSchema();

    const { searchParams } = new URL(req.url);
    const rawStoreId = searchParams.get('store_id');
    const selectedStoreId = rawStoreId && rawStoreId !== 'all' ? Number(rawStoreId) : null;
    const hasStoreFilter = Number.isFinite(selectedStoreId) && selectedStoreId > 0;
    const date_from = searchParams.get('date_from') || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const date_to = searchParams.get('date_to') || new Date().toISOString().split('T')[0];
    const period = searchParams.get('period') || 'daily'; // daily, monthly, yearly

    // Base query filter
    const storeFilter = hasStoreFilter ? `AND sb.store_id = ${selectedStoreId}` : '';
    const storeWhere = hasStoreFilter ? `WHERE s.id = ${selectedStoreId}` : '';

    // 1. Total Sales & Revenue
    const salesRes = await query(`
      SELECT 
        COALESCE(SUM(sb.grand_total), 0) as total_sales,
        COALESCE(SUM(sb.tax_total), 0) as total_tax,
        COALESCE(SUM(sb.round_off), 0) as total_roundoff,
        COUNT(DISTINCT sb.id) as total_transactions,
        COUNT(DISTINCT NULLIF(sb.customer_mobile, '')) as unique_customers,
        COALESCE(AVG(sb.grand_total), 0) as avg_transaction_value
      FROM sales_bills sb
      WHERE DATE(sb.created_at) >= '${date_from}' 
        AND DATE(sb.created_at) <= '${date_to}'
        AND sb.status != 'cancelled'
        ${storeFilter}
    `).catch(() => ({ rows: [{ total_sales: 0, total_tax: 0, total_roundoff: 0, total_transactions: 0, unique_customers: 0, avg_transaction_value: 0 }] }));

    // 2. Gross Profit Calculation
    const profitRes = await query(`
      SELECT 
        COALESCE(SUM(sb.grand_total), 0) as gross_revenue,
        COALESCE(SUM(
          (sbi.qty * sbi.selling_price) - (sbi.qty * COALESCE(p.cost_price, 0))
        ), 0) as gross_profit
      FROM sales_bills sb
      LEFT JOIN sales_bill_items sbi ON sb.id = sbi.sales_bill_id
      LEFT JOIN products p ON p.id = sbi.product_id
      WHERE DATE(sb.created_at) >= '${date_from}' 
        AND DATE(sb.created_at) <= '${date_to}'
        AND sb.status != 'cancelled'
        ${storeFilter}
    `).catch(() => ({ rows: [{ gross_revenue: 0, gross_profit: 0 }] }));

    // 3. Store-wise Performance
    const storePerformanceRes = await query(`
      SELECT 
        s.id,
        s.name as store_name,
        COALESCE(COUNT(DISTINCT sb.id), 0) as transactions,
        COALESCE(SUM(sb.grand_total), 0) as sales,
        COALESCE(SUM(sb.tax_total), 0) as tax_collected,
        COALESCE(SUM(
          (sbi.qty * sbi.selling_price) - (sbi.qty * COALESCE(p.cost_price, 0))
        ), 0) as profit
      FROM stores s
      LEFT JOIN sales_bills sb ON s.id = sb.store_id 
        AND DATE(sb.created_at) >= '${date_from}'
        AND DATE(sb.created_at) <= '${date_to}'
        AND sb.status != 'cancelled'
      LEFT JOIN sales_bill_items sbi ON sb.id = sbi.sales_bill_id
      LEFT JOIN products p ON p.id = sbi.product_id
      ${storeWhere}
      GROUP BY s.id, s.name
      ORDER BY sales DESC
    `).catch(() => ({ rows: [] }));

    // 4. Daily/Monthly Sales Trend
    const dateFormat = period === 'monthly' ? 'YYYY-MM' : 'YYYY-MM-DD';
    const trendsRes = await query(`
      SELECT 
        DATE(sb.created_at)::text as date,
        COALESCE(COUNT(DISTINCT sb.id), 0) as transactions,
        COALESCE(SUM(sb.grand_total), 0) as sales,
        COALESCE(SUM(sb.tax_total), 0) as tax,
        COALESCE(SUM(
          (sbi.qty * sbi.selling_price) - (sbi.qty * COALESCE(p.cost_price, 0))
        ), 0) as profit
      FROM sales_bills sb
      LEFT JOIN sales_bill_items sbi ON sb.id = sbi.sales_bill_id
      LEFT JOIN products p ON p.id = sbi.product_id
      WHERE DATE(sb.created_at) >= '${date_from}' 
        AND DATE(sb.created_at) <= '${date_to}'
        AND sb.status != 'cancelled'
        ${storeFilter}
      GROUP BY DATE(sb.created_at)
      ORDER BY DATE(sb.created_at) ASC
    `).catch(() => ({ rows: [] }));

    // 5. Inventory Valuation
    const inventoryRes = await query(`
      SELECT
        COALESCE(COUNT(DISTINCT ps.product_id), 0) as total_products,
        COALESCE(SUM(stock.available_stock), 0) as total_stock_units,
        COALESCE(SUM(stock.available_stock * COALESCE(p.cost_price, 0)), 0) as inventory_value_cost,
        COALESCE(SUM(stock.available_stock * COALESCE(NULLIF(ps.mrp, 0), p.mrp, 0)), 0) as inventory_value_retail
      FROM product_saleability ps
      INNER JOIN products p ON p.id = ps.product_id
      LEFT JOIN stores s ON s.id = ps.store_id
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(in_qty.qty, 0) - COALESCE(sale_qty.qty, 0) - COALESCE(out_qty.qty, 0) AS available_stock
        FROM (
          SELECT SUM(sii.qty) AS qty
          FROM stock_in_items sii
          INNER JOIN stock_in si ON si.id = sii.stock_in_id
          WHERE si.status = 'confirmed'
            AND si.destination_id = ps.store_id
            AND sii.product_id = ps.product_id
        ) in_qty,
        (
          SELECT SUM(sbi.qty) AS qty
          FROM sales_bill_items sbi
          INNER JOIN sales_bills sb ON sb.id = sbi.sales_bill_id
          WHERE sb.status IN ('paid', 'completed')
            AND sb.store_id = ps.store_id
            AND sbi.product_id = ps.product_id
        ) sale_qty,
        (
          SELECT SUM(soi.qty) AS qty
          FROM stock_out_items soi
          INNER JOIN stock_out so ON so.id = soi.stock_out_id
          WHERE so.status = 'confirmed'
            AND so.destination_id = ps.store_id
            AND COALESCE(so.reference_type, '') <> 'sales_bill'
            AND soi.product_id = ps.product_id
        ) out_qty
      ) stock ON TRUE
      WHERE ps.is_active = TRUE
        ${hasStoreFilter ? `AND ps.store_id = ${selectedStoreId}` : ''}
    `).catch(() => ({ rows: [{ total_products: 0, total_stock_units: 0, inventory_value_cost: 0, inventory_value_retail: 0 }] }));

    // 6. Fast-moving vs Slow-moving Items
    const movingItemsRes = await query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        COALESCE(SUM(sbi.qty), 0) as quantity_sold,
        COALESCE(SUM(sbi.qty * sbi.selling_price), 0) as revenue,
        COALESCE(AVG(sbi.selling_price), 0) as avg_price,
        CASE 
          WHEN COALESCE(SUM(sbi.qty), 0) > 50 THEN 'Fast-Moving'
          WHEN COALESCE(SUM(sbi.qty), 0) > 10 THEN 'Medium-Moving'
          ELSE 'Slow-Moving'
        END as movement_category
      FROM products p
      INNER JOIN product_saleability ps ON ps.product_id = p.id AND ps.is_active = TRUE
      LEFT JOIN sales_bill_items sbi ON p.id = sbi.product_id
      LEFT JOIN sales_bills sb ON sbi.sales_bill_id = sb.id
        AND DATE(sb.created_at) >= '${date_from}'
        AND DATE(sb.created_at) <= '${date_to}'
        AND sb.store_id = ps.store_id
      ${hasStoreFilter ? `WHERE ps.store_id = ${selectedStoreId}` : ''}
      GROUP BY p.id, p.name, p.sku
      ORDER BY quantity_sold DESC
      LIMIT 50
    `).catch(() => ({ rows: [] }));

    // 7. Live Stock Alerts
    const stockAlertsRes = await query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        COALESCE(stock.available_stock, 0) as current_stock,
        COALESCE(NULLIF(ps.low_stock_value, 0), 10) as reorder_level,
        CASE 
          WHEN COALESCE(stock.available_stock, 0) <= 0 THEN 'Out of Stock'
          WHEN COALESCE(stock.available_stock, 0) <= COALESCE(NULLIF(ps.low_stock_value, 0), 10) THEN 'Low Stock'
          ELSE 'In Stock'
        END as stock_status,
        COALESCE(SUM(sbi.qty), 0) as last_30days_sales
      FROM products p
      INNER JOIN product_saleability ps ON ps.product_id = p.id AND ps.is_active = TRUE
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(in_qty.qty, 0) - COALESCE(sale_qty.qty, 0) - COALESCE(out_qty.qty, 0) AS available_stock
        FROM (
          SELECT SUM(sii.qty) AS qty
          FROM stock_in_items sii
          INNER JOIN stock_in si ON si.id = sii.stock_in_id
          WHERE si.status = 'confirmed'
            AND si.destination_id = ps.store_id
            AND sii.product_id = ps.product_id
        ) in_qty,
        (
          SELECT SUM(sbi2.qty) AS qty
          FROM sales_bill_items sbi2
          INNER JOIN sales_bills sb2 ON sb2.id = sbi2.sales_bill_id
          WHERE sb2.status IN ('paid', 'completed')
            AND sb2.store_id = ps.store_id
            AND sbi2.product_id = ps.product_id
        ) sale_qty,
        (
          SELECT SUM(soi.qty) AS qty
          FROM stock_out_items soi
          INNER JOIN stock_out so ON so.id = soi.stock_out_id
          WHERE so.status = 'confirmed'
            AND so.destination_id = ps.store_id
            AND COALESCE(so.reference_type, '') <> 'sales_bill'
            AND soi.product_id = ps.product_id
        ) out_qty
      ) stock ON TRUE
      LEFT JOIN sales_bill_items sbi ON p.id = sbi.product_id
      LEFT JOIN sales_bills sb ON sbi.sales_bill_id = sb.id
        AND DATE(sb.created_at) >= DATE(CURRENT_DATE - INTERVAL '30 days')
        AND sb.store_id = ps.store_id
      ${hasStoreFilter ? `WHERE ps.store_id = ${selectedStoreId}` : ''}
      GROUP BY p.id, p.name, p.sku, ps.low_stock_value, stock.available_stock
      HAVING COALESCE(stock.available_stock, 0) <= COALESCE(NULLIF(ps.low_stock_value, 0), 10)
      ORDER BY current_stock ASC
      LIMIT 50
    `).catch(() => ({ rows: [] }));

    // 8. Top Customers
    const topCustomersRes = await query(`
      SELECT 
        c.id,
        CONCAT_WS(' ', c.first_name, c.last_name) as name,
        c.mobile_number as phone,
        COUNT(DISTINCT sb.id) as transactions,
        COALESCE(SUM(sb.grand_total), 0) as total_spent,
        COALESCE(MAX(sb.created_at), NULL)::text as last_purchase_date
      FROM customers c
      LEFT JOIN sales_bills sb ON c.mobile_number = sb.customer_mobile
        AND DATE(sb.created_at) >= '${date_from}'
        AND DATE(sb.created_at) <= '${date_to}'
        AND sb.status != 'cancelled'
      ${hasStoreFilter ? `WHERE sb.store_id = ${selectedStoreId}` : ''}
      GROUP BY c.id, c.first_name, c.last_name, c.mobile_number
      HAVING COUNT(DISTINCT sb.id) > 0
      ORDER BY total_spent DESC
      LIMIT 20
    `).catch(() => ({ rows: [] }));

    // 9. Staff Productivity
    const staffProductivityRes = await query(`
      SELECT 
        e.id,
        CONCAT_WS(' ', e.first_name, e.last_name) as name,
        COUNT(DISTINCT sb.id) as bills_created,
        COALESCE(SUM(sb.grand_total), 0) as sales_value,
        COALESCE(AVG(sb.grand_total), 0) as avg_bill_value,
        COALESCE(SUM(sb.tax_total), 0) as tax_collected
      FROM employees e
      LEFT JOIN sales_bills sb ON e.user_id = sb.user_id
        AND DATE(sb.created_at) >= '${date_from}'
        AND DATE(sb.created_at) <= '${date_to}'
        AND sb.status != 'cancelled'
      ${hasStoreFilter ? `WHERE sb.store_id = ${selectedStoreId}` : ''}
      GROUP BY e.id, e.first_name, e.last_name
      ORDER BY sales_value DESC
      LIMIT 20
    `).catch(() => ({ rows: [] }));

    // 10. Payment Mode Analysis
    const paymentModesRes = await query(`
      SELECT 
        payment_mode,
        COALESCE(COUNT(DISTINCT id), 0) as transactions,
        COALESCE(SUM(grand_total), 0) as amount
      FROM sales_bills
      WHERE DATE(created_at) >= '${date_from}' 
        AND DATE(created_at) <= '${date_to}'
        AND status != 'cancelled'
        ${storeFilter}
      GROUP BY payment_mode
      ORDER BY amount DESC
    `).catch(() => ({ rows: [] }));

    const salesData = salesRes.rows[0] || {};
    const profitData = profitRes.rows[0] || {};

    return successResponse({
      summary: {
        total_sales: parseFloat(salesData.total_sales || 0),
        total_tax: parseFloat(salesData.total_tax || 0),
        total_transactions: parseInt(salesData.total_transactions || 0),
        unique_customers: parseInt(salesData.unique_customers || 0),
        avg_transaction_value: parseFloat(salesData.avg_transaction_value || 0),
      },
      profitability: {
        gross_revenue: parseFloat(profitData.gross_revenue || 0),
        gross_profit: parseFloat(profitData.gross_profit || 0),
        gross_margin_percent: profitData.gross_revenue ? ((profitData.gross_profit / profitData.gross_revenue) * 100).toFixed(2) : 0,
      },
      store_performance: storePerformanceRes.rows || [],
      sales_trends: trendsRes.rows || [],
      inventory: inventoryRes.rows[0] || {},
      moving_items: movingItemsRes.rows || [],
      stock_alerts: stockAlertsRes.rows || [],
      top_customers: topCustomersRes.rows || [],
      staff_productivity: staffProductivityRes.rows || [],
      payment_modes: paymentModesRes.rows || [],
    });
  } catch (err) {
    console.error('Dashboard analytics error:', err);
    return errorResponse(err.message);
  }
}
