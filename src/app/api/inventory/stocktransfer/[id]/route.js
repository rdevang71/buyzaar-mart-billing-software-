import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureStockTransferSchema } from '@/lib/stockTransferSchema';
import { requireAuth, requirePermission, requireStore } from '@/lib/api-protection';

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    await ensureStockTransferSchema();
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const permissionCheck = requirePermission(auth.user, 'VIEW_INVENTORY', 'MANAGE_INVENTORY');
    if (permissionCheck.error) return permissionCheck.error;

    const res = await query(
      `SELECT
        st.id,
        st.source_id,
        st.destination_id,
        st.apply_taxes,
        st.status,
        st.invoice_number,
        st.invoice_date,
        st.other_charges,
        st.remarks,
        st.meta,
        source.name AS source_name,
        destination.name AS destination_name
      FROM stock_transfer st
      LEFT JOIN stores source ON source.id = st.source_id
      LEFT JOIN stores destination ON destination.id = st.destination_id
      WHERE st.id = $1`,
      [id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const row = res.rows[0];
    const visibleStoreId = row.destination_id || row.source_id;
    const storeCheck = requireStore(auth.user, visibleStoreId);
    if (storeCheck.error) return storeCheck.error;

    const meta = typeof row.meta === 'object' ? row.meta : {};
    return NextResponse.json({
      id: row.id,
      source: row.source_id || meta.source || '',
      sourceName: row.source_name || '',
      destination: row.destination_id || meta.destination || '',
      destinationName: row.destination_name || '',
      applyTaxes: row.apply_taxes,
      status: row.status || 'draft',
      invoice_number: row.invoice_number || '',
      invoice_date: row.invoice_date ? String(row.invoice_date).slice(0, 10) : '',
      other_charges: row.other_charges ?? '',
      remarks: row.remarks || '',
      meta,
    });
  } catch (err) {
    console.error('[stocktransfer GET id]', err.message);
    return NextResponse.json({ error: 'Failed to load stock transfer' }, { status: 500 });
  }
}
