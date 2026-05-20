import { query } from '@/lib/db';
import { ensureUsersTable } from '@/lib/userAuth';
import { ensureStockOutSchema } from '@/lib/stockOutSchema';
import { ensureUserCounterSessionSchema } from '@/lib/userCounterSessionSchema';

const CREATE_SALES_BILLS_SQL = `
  CREATE TABLE IF NOT EXISTS sales_bills (
    id BIGSERIAL PRIMARY KEY,
    bill_number VARCHAR(60) NOT NULL UNIQUE,
    session_id VARCHAR(120),
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    store_id BIGINT REFERENCES stores(id) ON DELETE SET NULL,
    counter_id BIGINT,
    customer_name VARCHAR(190),
    customer_mobile VARCHAR(40),
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
    discount_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    tax_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    round_off NUMERIC(14, 2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    balance_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    payment_mode VARCHAR(40) NOT NULL DEFAULT 'cash',
    payment_meta JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'paid',
    remarks TEXT,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const CREATE_SALES_BILL_ITEMS_SQL = `
  CREATE TABLE IF NOT EXISTS sales_bill_items (
    id BIGSERIAL PRIMARY KEY,
    sales_bill_id BIGINT NOT NULL REFERENCES sales_bills(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    barcode VARCHAR(120),
    sku VARCHAR(120),
    qty NUMERIC(14, 3) NOT NULL DEFAULT 1,
    mrp NUMERIC(14, 2) NOT NULL DEFAULT 0,
    selling_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(14, 2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    line_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const CREATE_SALES_BILL_PAYMENTS_SQL = `
  CREATE TABLE IF NOT EXISTS sales_bill_payments (
    id BIGSERIAL PRIMARY KEY,
    sales_bill_id BIGINT NOT NULL REFERENCES sales_bills(id) ON DELETE CASCADE,
    method VARCHAR(40) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    reference_no VARCHAR(120),
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const CREATE_CASHIER_CLOSINGS_SQL = `
  CREATE TABLE IF NOT EXISTS cashier_closings (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(120) NOT NULL UNIQUE,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    store_id BIGINT REFERENCES stores(id) ON DELETE SET NULL,
    opening_cash NUMERIC(14, 2) NOT NULL DEFAULT 0,
    expected_cash NUMERIC(14, 2) NOT NULL DEFAULT 0,
    actual_cash NUMERIC(14, 2) NOT NULL DEFAULT 0,
    variance NUMERIC(14, 2) NOT NULL DEFAULT 0,
    payment_breakup JSONB NOT NULL DEFAULT '{}'::jsonb,
    remarks TEXT,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const MIGRATE_SALES_BILLING_SQL = `
  ALTER TABLE sales_bills
    ADD COLUMN IF NOT EXISTS bill_number VARCHAR(60),
    ADD COLUMN IF NOT EXISTS session_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS store_id BIGINT REFERENCES stores(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS counter_id BIGINT,
    ADD COLUMN IF NOT EXISTS customer_name VARCHAR(190),
    ADD COLUMN IF NOT EXISTS customer_mobile VARCHAR(40),
    ADD COLUMN IF NOT EXISTS subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS round_off NUMERIC(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS grand_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(40) NOT NULL DEFAULT 'cash',
    ADD COLUMN IF NOT EXISTS payment_meta JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'paid',
    ADD COLUMN IF NOT EXISTS remarks TEXT,
    ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

  UPDATE sales_bills
  SET bill_number = COALESCE(bill_number, 'BILL-' || id::text)
  WHERE bill_number IS NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS sales_bills_bill_number_unique_idx
    ON sales_bills (bill_number);

  ALTER TABLE sales_bill_items
    ADD COLUMN IF NOT EXISTS product_name VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS barcode VARCHAR(120),
    ADD COLUMN IF NOT EXISTS sku VARCHAR(120),
    ADD COLUMN IF NOT EXISTS qty NUMERIC(14, 3) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS mrp NUMERIC(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS selling_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS line_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

  ALTER TABLE sales_bill_payments
    ADD COLUMN IF NOT EXISTS method VARCHAR(40) NOT NULL DEFAULT 'cash',
    ADD COLUMN IF NOT EXISTS amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reference_no VARCHAR(120),
    ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
`;

const globalForSalesBilling = globalThis;

export async function ensureSalesBillingSchema() {
  if (!globalForSalesBilling._salesBillingSchemaReadyPromise) {
    globalForSalesBilling._salesBillingSchemaReadyPromise = (async () => {
      await ensureUsersTable();
      await ensureUserCounterSessionSchema();
      await ensureStockOutSchema();
      await query(CREATE_SALES_BILLS_SQL);
      await query(CREATE_SALES_BILL_ITEMS_SQL);
      await query(CREATE_SALES_BILL_PAYMENTS_SQL);
      await query(CREATE_CASHIER_CLOSINGS_SQL);
      await query(MIGRATE_SALES_BILLING_SQL);
    })().catch((err) => {
      globalForSalesBilling._salesBillingSchemaReadyPromise = null;
      throw err;
    });
  }

  await globalForSalesBilling._salesBillingSchemaReadyPromise;
}
