import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureStockInSchema } from '@/lib/stockInSchema';
import { ensureVendorsSchema } from '@/lib/vendorsSchema';
import { ensurePurchaseOrderSchema } from '@/lib/purchaseOrderSchema';

export async function GET(request, { params }) {
  const { id } = params;
  try {
    await ensureStockInSchema();
    await ensureVendorsSchema();
    await ensurePurchaseOrderSchema();

    const res = await query(
      `SELECT po.id, po.transaction_id, po.destination_id, po.vendor_id, po.invoice_date, po.expected_delivery_date,
              po.shipment_mode, po.invoice_number, po.cc_emails, po.status, po.meta, po.total_items, po.total_cost, po.total_tax,
              po.created_at, po.confirmed_at,
              st.name AS destination_name,
              v.name AS vendor_name
       FROM purchase_orders po
       LEFT JOIN stores st ON st.id = po.destination_id
       LEFT JOIN vendors v ON v.id = po.vendor_id
       WHERE po.id = $1`,
      [id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const row = res.rows[0];
    const meta = typeof row.meta === 'object' && row.meta ? row.meta : {};
    return NextResponse.json({
      id: row.id,
      transactionId: row.transaction_id || `PO-${String(row.id).padStart(4, '0')}`,
      destination: row.destination_id,
      destinationName: row.destination_name || '',
      vendor: row.vendor_id,
      vendorName: row.vendor_name || '',
      invoice_date: row.invoice_date ? String(row.invoice_date).slice(0, 10) : meta.invoice_date || '',
      expected_delivery_date: row.expected_delivery_date ? String(row.expected_delivery_date).slice(0, 10) : meta.expected_delivery_date || '',
      shipment_mode: row.shipment_mode || meta.shipment_mode || '',
      invoice_number: row.invoice_number || meta.invoice_number || '',
      cc_emails: row.cc_emails || meta.cc_emails || '',
      status: row.status || 'draft',
      totalItems: Number(row.total_items || 0),
      totalCost: Number(row.total_cost || 0),
      totalTax: Number(row.total_tax || 0),
    });
  } catch (err) {
    console.error('[purchase-orders GET id]', err.message);
    return NextResponse.json({ error: 'Failed to load purchase order' }, { status: 500 });
  }
}
