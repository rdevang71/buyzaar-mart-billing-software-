import { NextResponse } from 'next/server';
import { getClient, query } from '@/lib/db';
import { ensureVendorsSchema } from '@/lib/vendorsSchema';
import { ensurePurchaseOrderSchema } from '@/lib/purchaseOrderSchema';
import { ensureVendorInvoicesSchema } from '@/lib/vendorInvoicesSchema';

function mapRow(row) {
  const totalAmount = Number(row.total_amount || 0);
  const amountPaid = Number(row.amount_paid || 0);
  const amountLeft = Math.max(totalAmount - amountPaid, 0);
  return {
    id: row.id,
    transactionId: row.transaction_id || `INV-${String(row.id).padStart(4, '0')}`,
    vendorId: row.vendor_id,
    vendorName: row.vendor_name || '—',
    poId: row.purchase_order_transaction_id || row.purchase_order_id || null,
    invoiceNumber: row.invoice_number,
    totalAmount,
    amountPaid,
    amountLeft,
    invoiceDate: row.invoice_date,
    dueDate: row.due_date,
    createdBy: row.created_by || 'System',
    remarks: row.remarks || '',
    status: row.status || 'Pending',
    createdAt: row.created_at,
  };
}

export async function GET() {
  try {
    await ensureVendorsSchema();
    await ensurePurchaseOrderSchema();
    await ensureVendorInvoicesSchema();

    const res = await query(
      `SELECT vi.id, vi.transaction_id, vi.vendor_id, vi.purchase_order_id, vi.invoice_number, vi.total_amount, vi.amount_paid,
              vi.due_date, vi.invoice_date, vi.created_by, vi.remarks, vi.status, vi.created_at,
              v.name AS vendor_name,
              po.transaction_id AS purchase_order_transaction_id
       FROM vendor_invoices vi
       LEFT JOIN vendors v ON v.id = vi.vendor_id
       LEFT JOIN purchase_orders po ON po.id = vi.purchase_order_id
       ORDER BY vi.created_at DESC
       LIMIT 200`
    );

    return NextResponse.json(res.rows.map(mapRow));
  } catch (err) {
    console.error('[vendor-invoices GET]', err.message);
    return NextResponse.json([]);
  }
}

export async function POST(request) {
  try {
    await ensureVendorsSchema();
    await ensurePurchaseOrderSchema();
    await ensureVendorInvoicesSchema();

    const body = await request.json();
    const vendorId = body.vendor || body.vendorId || null;
    const invoiceNumber = body.invoice_number || body.invoiceNumber || '';
    const totalAmount = Number(body.total_amount ?? body.amount ?? 0);
    const amountPaid = Number(body.amount_paid ?? 0);

    if (!vendorId) return NextResponse.json({ error: 'Vendor is required' }, { status: 400 });
    if (!invoiceNumber.trim()) return NextResponse.json({ error: 'Invoice number is required' }, { status: 400 });
    if (!Number.isFinite(totalAmount) || totalAmount < 0) return NextResponse.json({ error: 'Amount is required' }, { status: 400 });

    const client = await getClient();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `INSERT INTO vendor_invoices (
          vendor_id, purchase_order_id, invoice_number, total_amount, amount_paid,
          due_date, invoice_date, created_by, remarks, status, meta, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
        RETURNING id`,
        [
          vendorId,
          body.purchase_order_id || null,
          invoiceNumber,
          totalAmount,
          amountPaid,
          body.due_date || null,
          body.invoice_date || null,
          body.created_by || 'System',
          body.remarks || null,
          body.status || (amountPaid >= totalAmount ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Pending'),
          JSON.stringify(body),
        ]
      );

      const id = res.rows[0].id;
      const transactionId = `INV-${String(id).padStart(4, '0')}`;
      await client.query('UPDATE vendor_invoices SET transaction_id = $1 WHERE id = $2', [transactionId, id]);
      await client.query('COMMIT');
      return NextResponse.json({ id, transactionId }, { status: 201 });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[vendor-invoices POST]', err.message);
    return NextResponse.json({ error: 'Failed to create vendor invoice' }, { status: 500 });
  }
}
