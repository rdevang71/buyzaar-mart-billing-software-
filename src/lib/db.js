import { Pool } from 'pg';

// Singleton pool — reuse across hot reloads in dev
const globalForPg = globalThis;

if (!globalForPg._pgPool) {
  const poolMax = Number(process.env.PG_POOL_MAX || 20);
  const idleTimeoutMs = Number(process.env.PG_IDLE_TIMEOUT_MS || 30000);
  const connectTimeoutMs = Number(process.env.PG_CONNECT_TIMEOUT_MS || 10000);

  globalForPg._pgPool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME     || 'billingpro',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: Number.isFinite(poolMax) ? poolMax : 20,
    idleTimeoutMillis: Number.isFinite(idleTimeoutMs) ? idleTimeoutMs : 30000,
    connectionTimeoutMillis: Number.isFinite(connectTimeoutMs) ? connectTimeoutMs : 10000,
  });

  globalForPg._pgPool.on('error', (err) => {
    console.error('PostgreSQL Pool Error:', err);
  });
}

const pool = globalForPg._pgPool;
const shouldLogQueries = process.env.NODE_ENV !== 'production' || process.env.DEBUG_SQL === 'true';

/**
 * Run a query
 * @param {string} text  - SQL query
 * @param {any[]}  params - Query parameters ($1, $2 ...)
 */
export async function query(text, params = []) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (shouldLogQueries) {
      console.log(`[DB] ${duration}ms — ${text.substring(0, 80)}`);
    }
    return res;
  } catch (err) {
    console.error('[DB ERROR]', err.message, '\nQuery:', text);
    throw err;
  }
}

/**
 * Get a client for transactions
 */
export async function getClient() {
  return await pool.connect();
}

export default pool;
