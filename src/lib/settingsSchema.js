import { query } from '@/lib/db';
import { ensureStoresSchema } from '@/lib/storesSchema';

const CREATE_SETTINGS_RECORDS_SQL = `
  CREATE TABLE IF NOT EXISTS settings_records (
    id BIGSERIAL PRIMARY KEY,
    setting_type VARCHAR(120) NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(120),
    description TEXT,
    store_id BIGINT REFERENCES stores(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (setting_type, code, store_id)
  );
`;

const MIGRATE_SETTINGS_RECORDS_SQL = `
  CREATE INDEX IF NOT EXISTS idx_settings_records_type ON settings_records(setting_type);
  CREATE INDEX IF NOT EXISTS idx_settings_records_store ON settings_records(store_id);
  CREATE INDEX IF NOT EXISTS idx_settings_records_active ON settings_records(is_active);
`;

const globalForSettings = globalThis;

export async function ensureSettingsSchema() {
  if (!globalForSettings._settingsSchemaReadyPromise) {
    globalForSettings._settingsSchemaReadyPromise = (async () => {
      await ensureStoresSchema();
      await query(CREATE_SETTINGS_RECORDS_SQL);
      await query(MIGRATE_SETTINGS_RECORDS_SQL);
    })().catch((err) => {
      globalForSettings._settingsSchemaReadyPromise = null;
      throw err;
    });
  }

  await globalForSettings._settingsSchemaReadyPromise;
}
