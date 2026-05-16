import { query } from '@/lib/db';

let ensured = false;

export async function ensureVendorsSchema() {
  if (ensured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS vendors (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      company VARCHAR(255),
      short_code VARCHAR(50),
      business VARCHAR(255),
      address_1 TEXT,
      address_2 TEXT,
      city VARCHAR(255),
      state VARCHAR(255),
      pincode VARCHAR(50),
      country VARCHAR(255),
      email VARCHAR(255),
      mobile_number VARCHAR(50),
      gst_number VARCHAR(100),
      pan_number VARCHAR(100),
      margin NUMERIC(7,2) DEFAULT 0,
      meta JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  ensured = true;
}

export default null;
