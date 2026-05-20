import { query } from '@/lib/db';

let ensured = false;

export async function ensureStockInSchema() {
  if (ensured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS stores (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS stock_in (
      id SERIAL PRIMARY KEY,
      transaction_id VARCHAR(50) UNIQUE,
      method VARCHAR(50) DEFAULT 'new',
      destination_id INTEGER REFERENCES stores(id),
      apply_taxes BOOLEAN DEFAULT true,
      add_products_prefill BOOLEAN DEFAULT false,
      status VARCHAR(20) DEFAULT 'draft',
      vendor_name VARCHAR(255),
      invoice_date DATE,
      invoice_number VARCHAR(100),
      other_charges NUMERIC(14, 2) DEFAULT 0,
      remarks TEXT,
      total_items NUMERIC(14, 3) DEFAULT 0,
      total_cost NUMERIC(14, 2) DEFAULT 0,
      total_tax NUMERIC(14, 2) DEFAULT 0,
      reference_type VARCHAR(50),
      reference_id VARCHAR(100),
      meta JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      confirmed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS stock_in_items (
      id SERIAL PRIMARY KEY,
      stock_in_id INTEGER NOT NULL REFERENCES stock_in(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL,
      product_name VARCHAR(255),
      qty NUMERIC(14, 3) NOT NULL DEFAULT 1,
      cost_price NUMERIC(14, 2) DEFAULT 0,
      tax_value NUMERIC(14, 2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  ensured = true;
}
