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
    })().catch((err) => {
      globalForSalesBilling._salesBillingSchemaReadyPromise = null;
      throw err;
    });
  }

  await globalForSalesBilling._salesBillingSchemaReadyPromise;
}
