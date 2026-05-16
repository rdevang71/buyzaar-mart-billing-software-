import { NextResponse } from 'next/server';
import { applySalesOrderBulkAction, listSalesOrderRows } from '@/lib/salesOrderSectionApi';

function mapInvoiceSalesOrderRow(row) {
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
    invoice_id: row.invoice_id,
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

export async function GET(request) {
  try {
    const rows = await listSalesOrderRows('invoice-sales-order', request);
    return NextResponse.json(rows.map(mapInvoiceSalesOrderRow));
  } catch (err) {
    console.error('[invoice sales order GET]', err.message);
    return NextResponse.json([]);
  }
}

export async function POST(request) {
  try {
    const result = await applySalesOrderBulkAction('invoice-sales-order', request);
    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({
      success: true,
      updatedCount: result.updatedCount,
      rows: result.rows.map(mapInvoiceSalesOrderRow),
    });
  } catch (err) {
    console.error('[invoice sales order POST]', err.message);
    return NextResponse.json({ error: 'Failed to process bulk action' }, { status: 500 });
  }
}
