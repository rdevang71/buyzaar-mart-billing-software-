import { query } from '@/lib/db';

const STOCK_REQUISITION_SCHEMA_VERSION = 1;
const globalForStockRequisition = globalThis;

export async function ensureStockRequisitionSchema() {
  if (globalForStockRequisition._stockRequisitionSchemaVersion === STOCK_REQUISITION_SCHEMA_VERSION) return;

  await query(`
    CREATE TABLE IF NOT EXISTS stock_requisitions (
      id SERIAL PRIMARY KEY,
      transaction_id VARCHAR(50) UNIQUE,
      source_id INTEGER REFERENCES stores(id),
      destination_id INTEGER REFERENCES stores(id),
      requested_by VARCHAR(255),
      mail_to TEXT,
      remarks TEXT,
      status VARCHAR(30) DEFAULT 'pending',
      fulfillment_status VARCHAR(30) DEFAULT 'pending',
      approval_status VARCHAR(30) DEFAULT 'pending',
      purchase_order_id INTEGER REFERENCES purchase_orders(id),
      meta JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      approved_at TIMESTAMPTZ,
      fulfilled_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS stock_requisition_items (
      id SERIAL PRIMARY KEY,
      requisition_id INTEGER NOT NULL REFERENCES stock_requisitions(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      product_name VARCHAR(255),
      qty NUMERIC(14, 3) NOT NULL DEFAULT 1,
      fulfilled_qty NUMERIC(14, 3) NOT NULL DEFAULT 0,
      cost_price NUMERIC(14, 2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE stock_requisitions
      ADD COLUMN IF NOT EXISTS purchase_order_id INTEGER REFERENCES purchase_orders(id),
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;

    CREATE INDEX IF NOT EXISTS idx_stock_requisitions_destination ON stock_requisitions(destination_id);
    CREATE INDEX IF NOT EXISTS idx_stock_requisitions_status ON stock_requisitions(status, approval_status, fulfillment_status);
    CREATE INDEX IF NOT EXISTS idx_stock_requisition_items_req ON stock_requisition_items(requisition_id);
  `);

  globalForStockRequisition._stockRequisitionSchemaVersion = STOCK_REQUISITION_SCHEMA_VERSION;
}
