import { query } from '@/lib/db';

const SCHEMA_VERSION = 2;
let ensuredVersion = 0;

export async function ensureVendorsSchema() {
  if (ensuredVersion === SCHEMA_VERSION) return;
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
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      meta JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE vendors
      ADD COLUMN IF NOT EXISTS company VARCHAR(255),
      ADD COLUMN IF NOT EXISTS short_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS business VARCHAR(255),
      ADD COLUMN IF NOT EXISTS address_1 TEXT,
      ADD COLUMN IF NOT EXISTS address_2 TEXT,
      ADD COLUMN IF NOT EXISTS city VARCHAR(255),
      ADD COLUMN IF NOT EXISTS state VARCHAR(255),
      ADD COLUMN IF NOT EXISTS pincode VARCHAR(50),
      ADD COLUMN IF NOT EXISTS country VARCHAR(255),
      ADD COLUMN IF NOT EXISTS email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS gst_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS pan_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS margin NUMERIC(7,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_short_code_unique
      ON vendors(LOWER(short_code))
      WHERE short_code IS NOT NULL AND short_code <> '';
    CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_email_unique
      ON vendors(LOWER(email))
      WHERE email IS NOT NULL AND email <> '';
    CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_mobile_unique
      ON vendors(mobile_number)
      WHERE mobile_number IS NOT NULL AND mobile_number <> '';
    CREATE INDEX IF NOT EXISTS idx_vendors_active_name
      ON vendors(is_active, name);
  `);
  ensuredVersion = SCHEMA_VERSION;
}

export default null;
