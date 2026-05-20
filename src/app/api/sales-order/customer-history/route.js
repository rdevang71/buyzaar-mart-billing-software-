// File: src/app/api/sales-order/customer-history/route.js

import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    if (!search.trim()) {
      return errorResponse('Search term required', 400);
    }

    const needle = `%${search.toLowerCase()}%`;

    // Search by customer name or mobile number
    const billsRes = await query(
      `
      SELECT
        sb.id,
        sb.invoice_number as billNumber,
        sb.customer_name as customerName,
        sb.customer_mobile as customerMobile,
        sb.grand_total as grandTotal,
        sb.payment_mode as paymentMode,
        sb.status,
        sb.created_at as createdAt,
        COUNT(sbi.id) as itemCount,
        COALESCE(SUM(sb.discount_total), 0) as discountTotal,
        COALESCE(SUM(sb.tax_total), 0) as taxTotal
      FROM sales_bills sb
      LEFT JOIN sales_bill_items sbi ON sb.id = sbi.sales_bill_id
      WHERE 
        LOWER(sb.customer_name) LIKE $1 
        OR LOWER(sb.customer_mobile) LIKE $1
      GROUP BY sb.id
      ORDER BY sb.created_at DESC
      LIMIT 50
      `,
      [needle]
    );

    const bills = billsRes.rows.map(row => ({
      id: row.id,
      billNumber: row.billnumber,
      customerName: row.customername,
      customerMobile: row.customermobile,
      grandTotal: parseFloat(row.grandtotal || 0),
      paymentMode: row.paymentmode,
      status: row.status,
      createdAt: row.createdat,
      itemCount: parseInt(row.itemcount || 0),
      discountTotal: parseFloat(row.discounttotal || 0),
      taxTotal: parseFloat(row.taxtotal || 0),
    }));

    // Get summary stats
    const statsRes = await query(
      `
      SELECT
        COUNT(*) as totalBills,
        SUM(sb.grand_total) as totalSpent,
        AVG(sb.grand_total) as avgBill,
        MAX(sb.created_at) as lastPurchase
      FROM sales_bills sb
      WHERE 
        LOWER(sb.customer_name) LIKE $1 
        OR LOWER(sb.customer_mobile) LIKE $1
      `,
      [needle]
    );

    const stats = statsRes.rows[0];

    return successResponse({
      bills,
      stats: {
        totalBills: parseInt(stats.totalbills || 0),
        totalSpent: parseFloat(stats.totalspent || 0),
        avgBill: parseFloat(stats.avgbill || 0),
        lastPurchase: stats.lastpurchase,
      },
    });
  } catch (err) {
    console.error('Customer history error:', err);
    return errorResponse(err.message || 'Failed to load customer history');
  }
}