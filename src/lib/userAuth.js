import { query } from '@/lib/db';

const CREATE_USERS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
`;

const globalForUsers = globalThis;

export async function ensureUsersTable() {
  if (!globalForUsers._usersTableReadyPromise) {
    globalForUsers._usersTableReadyPromise = query(CREATE_USERS_TABLE_SQL).catch((err) => {
      globalForUsers._usersTableReadyPromise = null;
      throw err;
    });
  }

  await globalForUsers._usersTableReadyPromise;
}

export function normalizeEmail(email = '') {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone = '') {
  return phone.replace(/\D/g, '');
}
