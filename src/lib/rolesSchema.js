import { query } from '@/lib/db';

let ensured = false;

export async function ensureRolesSchema() {
  if (ensured) return;

  await query(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      role_name VARCHAR(255) NOT NULL UNIQUE,
      permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
      description TEXT,
      meta JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  ensured = true;
}

export default null;