import { query } from '@/lib/db';

let ensured = false;

export async function ensureVendorInvoicesSchema() {
  if (ensured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS vendor_invoices (
      id SERIAL PRIMARY KEY,
      transaction_id VARCHAR(50) UNIQUE,
      vendor_id INTEGER NOT NULL REFERENCES vendors(id),
      purchase_order_id INTEGER REFERENCES purchase_orders(id),
      invoice_number VARCHAR(100) NOT NULL,
      total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
      amount_paid NUMERIC(14, 2) NOT NULL DEFAULT 0,
      due_date DATE,
      invoice_date DATE DEFAULT NOW(),
      created_by VARCHAR(255),
      remarks TEXT,
      status VARCHAR(20) DEFAULT 'Pending',
      meta JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_vendor_invoices_vendor_id ON vendor_invoices(vendor_id);
    CREATE INDEX IF NOT EXISTS idx_vendor_invoices_status ON vendor_invoices(status);
    CREATE INDEX IF NOT EXISTS idx_vendor_invoices_invoice_number ON vendor_invoices(invoice_number);
  `);
  ensured = true;
}
