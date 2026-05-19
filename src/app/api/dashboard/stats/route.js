import { requireAuth } from '@/lib/api-protection';
import { successResponse, errorResponse } from '@/lib/api-response';
import { query } from '@/lib/db';

/**
 * GET /api/dashboard/stats
 * Fetch dashboard statistics for home page
 */
export async function GET(request) {
  try {
    // Verify authentication
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const { user } = auth;

    // ============================================
    // FETCH PRODUCT COUNT
    // ============================================
    let productCount = 0;
    try {
      const productsResult = await query(
        `SELECT COUNT(*)::int as count FROM products WHERE is_active = TRUE`
      );
      productCount = productsResult.rows[0]?.count || 0;
    } catch (err) {
      console.error('[DASHBOARD] Products query error:', err.message);
      productCount = 0;
    }

    // ============================================
    // FETCH CUSTOMER COUNT
    // ============================================
    let customerCount = 0;
    try {
      const customersResult = await query(
        `SELECT COUNT(*)::int as count FROM customers`
      );
      customerCount = customersResult.rows[0]?.count || 0;
    } catch (err) {
      console.error('[DASHBOARD] Customers query error:', err.message);
      customerCount = 0;
    }

    // ============================================
    // FETCH FIRST SALE STATUS
    // ============================================
    let firstSale = null;
    try {
      const firstSaleResult = await query(
        `SELECT id, sales_order_id as sale_number, gross_bill as total_amount, created_at 
         FROM invoice_sales_orders 
         ORDER BY created_at ASC 
         LIMIT 1`
      );
      firstSale = firstSaleResult.rows[0];
    } catch (err) {
      console.error('[DASHBOARD] First sale query error:', err.message);
      firstSale = null;
    }

    // ============================================
    // FETCH STORE STATUS
    // ============================================
    let store = null;
    try {
      const storesResult = await query(
        `SELECT id, name FROM stores LIMIT 1`
      );
      store = storesResult.rows[0];
    } catch (err) {
      console.error('[DASHBOARD] Stores query error:', err.message);
      store = null;
    }

    // ============================================
    // FETCH LOW STOCK PRODUCTS
    // ============================================
    let lowStockCount = 0;
    try {
      const lowStockResult = await query(
        `SELECT COUNT(*)::int as count
         FROM product_saleability ps
         WHERE ps.is_active = TRUE`
      );
      lowStockCount = lowStockResult.rows[0]?.count || 0;
    } catch (err) {
      console.error('[DASHBOARD] Low stock query error:', err.message);
      lowStockCount = 0;
    }

    // ============================================
    // FETCH RECENT SALES & METRICS
    // ============================================
    let salesMetrics = {
      totalSales: 0,
      todaySales: 0,
      totalRevenue: 0,
      todayRevenue: 0,
      recentOrders: []
    };
    try {
      // Get sales count
      const salesCountResult = await query(
        `SELECT COUNT(*)::int as count, 
                COALESCE(SUM(gross_bill), 0)::numeric as total_revenue
         FROM invoice_sales_orders 
         WHERE status IN ('Completed', 'Pending')`
      );
      salesMetrics.totalSales = salesCountResult.rows[0]?.count || 0;
      salesMetrics.totalRevenue = parseFloat(salesCountResult.rows[0]?.total_revenue || 0);

      // Get today's sales
      const todaySalesResult = await query(
        `SELECT COUNT(*)::int as count,
                COALESCE(SUM(gross_bill), 0)::numeric as today_revenue
         FROM invoice_sales_orders 
         WHERE DATE(created_at) = CURRENT_DATE
         AND status IN ('Completed', 'Pending')`
      );
      salesMetrics.todaySales = todaySalesResult.rows[0]?.count || 0;
      salesMetrics.todayRevenue = parseFloat(todaySalesResult.rows[0]?.today_revenue || 0);

      // Get recent orders
      const recentOrdersResult = await query(
        `SELECT 
          id, 
          invoice_id, 
          gross_bill as amount,
          created_at as date,
          status
         FROM invoice_sales_orders 
         ORDER BY created_at DESC 
         LIMIT 5`
      );
      salesMetrics.recentOrders = recentOrdersResult.rows || [];
    } catch (err) {
      console.error('[DASHBOARD] Sales metrics query error:', err.message);
    }

    return successResponse({
      products: productCount,
      customers: customerCount,
      lowStock: lowStockCount,
      firstSale: firstSale ? {
        id: firstSale.id,
        number: firstSale.sale_number,
        amount: firstSale.total_amount,
        date: firstSale.created_at,
      } : null,
      store: store ? {
        id: store.id,
        name: store.name,
      } : null,
      sales: salesMetrics,
    });

  } catch (err) {
    console.error('[DASHBOARD] Error:', err.message);
    return errorResponse('Unable to fetch dashboard stats');
  }
}
