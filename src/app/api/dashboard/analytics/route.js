import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { verifyToken } from '@/lib/auth-enhanced';

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

    const { searchParams } = new URL(req.url);
    const store_id = searchParams.get('store_id');
    const date_from = searchParams.get('date_from') || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const date_to = searchParams.get('date_to') || new Date().toISOString().split('T')[0];
    const period = searchParams.get('period') || 'daily'; // daily, monthly, yearly

    // Base query filter
    const storeFilter = store_id ? `AND sb.store_id = ${store_id}` : '';

    // 1. Total Sales & Revenue
    const salesRes = await query(`
      SELECT 
        COALESCE(SUM(sb.total_amount), 0) as total_sales,
        COALESCE(SUM(sb.total_tax), 0) as total_tax,
        COALESCE(SUM(sb.round_off), 0) as total_roundoff,
        COUNT(DISTINCT sb.id) as total_transactions,
        COUNT(DISTINCT sb.customer_id) as unique_customers,
        COALESCE(AVG(sb.total_amount), 0) as avg_transaction_value
      FROM sales_bills sb
      WHERE DATE(sb.created_at) >= '${date_from}' 
        AND DATE(sb.created_at) <= '${date_to}'
        AND sb.status != 'cancelled'
        ${storeFilter}
    `).catch(() => ({ rows: [{ total_sales: 0, total_tax: 0, total_roundoff: 0, total_transactions: 0, unique_customers: 0, avg_transaction_value: 0 }] }));

    // 2. Gross Profit Calculation
    const profitRes = await query(`
      SELECT 
        COALESCE(SUM(sb.total_amount), 0) as gross_revenue,
        COALESCE(SUM(
          (sbi.qty * sbi.selling_price) - (sbi.qty * sbi.cost_price)
        ), 0) as gross_profit
      FROM sales_bills sb
      LEFT JOIN sales_bill_items sbi ON sb.id = sbi.sales_bill_id
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
        COALESCE(SUM(sb.total_amount), 0) as sales,
        COALESCE(SUM(sb.total_tax), 0) as tax_collected,
        COALESCE(SUM(
          (sbi.qty * sbi.selling_price) - (sbi.qty * sbi.cost_price)
        ), 0) as profit
      FROM stores s
      LEFT JOIN sales_bills sb ON s.id = sb.store_id 
        AND DATE(sb.created_at) >= '${date_from}'
        AND DATE(sb.created_at) <= '${date_to}'
        AND sb.status != 'cancelled'
      LEFT JOIN sales_bill_items sbi ON sb.id = sbi.sales_bill_id
      GROUP BY s.id, s.name
      ORDER BY sales DESC
    `).catch(() => ({ rows: [] }));

    // 4. Daily/Monthly Sales Trend
    const dateFormat = period === 'monthly' ? 'YYYY-MM' : 'YYYY-MM-DD';
    const trendsRes = await query(`
      SELECT 
        DATE(sb.created_at)::text as date,
        COALESCE(COUNT(DISTINCT sb.id), 0) as transactions,
        COALESCE(SUM(sb.total_amount), 0) as sales,
        COALESCE(SUM(sb.total_tax), 0) as tax,
        COALESCE(SUM(
          (sbi.qty * sbi.selling_price) - (sbi.qty * sbi.cost_price)
        ), 0) as profit
      FROM sales_bills sb
      LEFT JOIN sales_bill_items sbi ON sb.id = sbi.sales_bill_id
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
        COALESCE(COUNT(DISTINCT p.id), 0) as total_products,
        COALESCE(SUM(sii.qty), 0) as total_stock_units,
        COALESCE(SUM(sii.qty * p.cost_price), 0) as inventory_value_cost,
        COALESCE(SUM(sii.qty * p.mrp), 0) as inventory_value_retail
      FROM products p
      LEFT JOIN stock_in_items sii ON p.id = sii.product_id
      ${store_id ? `WHERE p.store_id = ${store_id}` : ''}
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
      LEFT JOIN sales_bill_items sbi ON p.id = sbi.product_id
      LEFT JOIN sales_bills sb ON sbi.sales_bill_id = sb.id
        AND DATE(sb.created_at) >= '${date_from}'
        AND DATE(sb.created_at) <= '${date_to}'
      ${store_id ? `WHERE p.store_id = ${store_id}` : ''}
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
        COALESCE(sii.qty, 0) as current_stock,
        COALESCE(p.reorder_level, 0) as reorder_level,
        CASE 
          WHEN COALESCE(sii.qty, 0) = 0 THEN 'Out of Stock'
          WHEN COALESCE(sii.qty, 0) <= COALESCE(p.reorder_level, 10) THEN 'Low Stock'
          ELSE 'In Stock'
        END as stock_status,
        COALESCE(SUM(sbi.qty), 0) as last_30days_sales
      FROM products p
      LEFT JOIN stock_in_items sii ON p.id = sii.product_id
      LEFT JOIN sales_bill_items sbi ON p.id = sbi.product_id
      LEFT JOIN sales_bills sb ON sbi.sales_bill_id = sb.id
        AND DATE(sb.created_at) >= DATE(CURRENT_DATE - INTERVAL '30 days')
      ${store_id ? `WHERE p.store_id = ${store_id}` : ''}
      GROUP BY p.id, p.name, p.sku, sii.qty, p.reorder_level
      HAVING COALESCE(sii.qty, 0) <= COALESCE(p.reorder_level, 10) OR COALESCE(sii.qty, 0) = 0
      ORDER BY current_stock ASC
      LIMIT 50
    `).catch(() => ({ rows: [] }));

    // 8. Top Customers
    const topCustomersRes = await query(`
      SELECT 
        c.id,
        c.name,
        c.phone,
        COUNT(DISTINCT sb.id) as transactions,
        COALESCE(SUM(sb.total_amount), 0) as total_spent,
        COALESCE(MAX(sb.created_at), NULL)::text as last_purchase_date
      FROM customers c
      LEFT JOIN sales_bills sb ON c.id = sb.customer_id
        AND DATE(sb.created_at) >= '${date_from}'
        AND DATE(sb.created_at) <= '${date_to}'
        AND sb.status != 'cancelled'
      ${store_id ? `WHERE sb.store_id = ${store_id}` : ''}
      GROUP BY c.id, c.name, c.phone
      HAVING COUNT(DISTINCT sb.id) > 0
      ORDER BY total_spent DESC
      LIMIT 20
    `).catch(() => ({ rows: [] }));

    // 9. Staff Productivity
    const staffProductivityRes = await query(`
      SELECT 
        e.id,
        e.name,
        COUNT(DISTINCT sb.id) as bills_created,
        COALESCE(SUM(sb.total_amount), 0) as sales_value,
        COALESCE(AVG(sb.total_amount), 0) as avg_bill_value,
        COALESCE(SUM(sb.total_tax), 0) as tax_collected
      FROM employees e
      LEFT JOIN sales_bills sb ON e.id = sb.created_by
        AND DATE(sb.created_at) >= '${date_from}'
        AND DATE(sb.created_at) <= '${date_to}'
        AND sb.status != 'cancelled'
      ${store_id ? `WHERE sb.store_id = ${store_id}` : ''}
      GROUP BY e.id, e.name
      ORDER BY sales_value DESC
      LIMIT 20
    `).catch(() => ({ rows: [] }));

    // 10. Payment Mode Analysis
    const paymentModesRes = await query(`
      SELECT 
        payment_mode,
        COALESCE(COUNT(DISTINCT id), 0) as transactions,
        COALESCE(SUM(total_amount), 0) as amount
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
