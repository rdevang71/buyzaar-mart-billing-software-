import { NextResponse } from 'next/server';

const sampleRows = [
  {
    storeId: 'S001', storeName: 'Main Store', customerId: 'C001', customerName: 'John Doe', customerAccountId: 'CA1001',
    date: '2026-05-16', transactionId: 'T1001', posDate: '2026-05-16', transactionType: 'Sale', openingBalance: '1000.00', transactionAmount: '250.00', closingBalance: '1250.00', transactionActivity: 'Sale', phone: '9876543210', paymentType: 'Cash', store: 'Main', remarks: '', settlementStatus: 'Pending'
  }
];

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  // For now ignore filters and return sample
  return new Response(JSON.stringify({ rows: sampleRows }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
