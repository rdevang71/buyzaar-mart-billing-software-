import { query } from '@/lib/db';
import { ensureUsersTable } from '@/lib/userAuth';
import { ensureStockInSchema } from '@/lib/stockInSchema';

const CREATE_USER_COUNTER_SESSIONS_SQL = `
  CREATE TABLE IF NOT EXISTS user_counter_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    counter_id BIGINT,
    device_id BIGINT,
    store_id BIGINT REFERENCES stores(id) ON DELETE SET NULL,
    session_id VARCHAR(120) NOT NULL UNIQUE,
    session_start_at TIMESTAMP NOT NULL,
    session_end_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    serial_number VARCHAR(120),
    counter_name VARCHAR(190),
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
`;

const globalForUserCounterSessions = globalThis;

export async function ensureUserCounterSessionSchema() {
  if (!globalForUserCounterSessions._userCounterSessionsSchemaReadyPromise) {
    globalForUserCounterSessions._userCounterSessionsSchemaReadyPromise = (async () => {
      await ensureUsersTable();
      await ensureStockInSchema();
      await query(CREATE_USER_COUNTER_SESSIONS_SQL);
    })().catch((err) => {
      globalForUserCounterSessions._userCounterSessionsSchemaReadyPromise = null;
      throw err;
    });
  }

  await globalForUserCounterSessions._userCounterSessionsSchemaReadyPromise;
}