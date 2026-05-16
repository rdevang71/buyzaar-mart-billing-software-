import { NextResponse } from 'next/server';
import { applySalesOrderBulkAction, listSalesOrderRows } from '@/lib/salesOrderSectionApi';

export async function GET(request, { params }) {
  try {
    const rows = await listSalesOrderRows(params?.view, request);
    return NextResponse.json(rows);
  } catch (err) {
    console.error('[sales order GET]', err.message);
    return NextResponse.json([]);
  }
}

export async function POST(request, { params }) {
  try {
    const result = await applySalesOrderBulkAction(params?.view, request);
    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[sales order POST]', err.message);
    return NextResponse.json({ error: 'Failed to process bulk action' }, { status: 500 });
  }
}
