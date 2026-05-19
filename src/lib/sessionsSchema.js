import { query } from '@/lib/db';

let ensured = false;

/**
 * Ensure sessions table exists
 * Tracks active user sessions
 */
export async function ensureSessionsSchema() {
  if (ensured) return;

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        access_token_hash VARCHAR(64) NOT NULL,
        refresh_token_hash VARCHAR(64),
        ip_address VARCHAR(45),
        user_agent VARCHAR(500),
        expires_at TIMESTAMP NOT NULL,
        refresh_expires_at TIMESTAMP,
        last_activity TIMESTAMP NOT NULL DEFAULT NOW(),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Indexes for performance
    await query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(access_token_hash);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);`);

    ensured = true;
  } catch (err) {
    console.error('[SESSIONS_SCHEMA] Error:', err.message);
    throw err;
  }
}

/**
 * Create a new session
 */
export async function createSession(userId, tokenHashes, ipAddress, userAgent) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const result = await query(
    `INSERT INTO sessions 
     (user_id, access_token_hash, refresh_token_hash, ip_address, user_agent, expires_at, refresh_expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [userId, tokenHashes.accessTokenHash, tokenHashes.refreshTokenHash, ipAddress, userAgent, expiresAt, refreshExpiresAt]
  );

  return result.rows[0];
}

/**
 * Get active sessions for a user
 */
export async function getUserSessions(userId) {
  const result = await query(
    `SELECT id, ip_address, user_agent, created_at, last_activity, is_active
     FROM sessions
     WHERE user_id = $1 AND is_active = TRUE AND expires_at > NOW()
     ORDER BY last_activity DESC`,
    [userId]
  );

  return result.rows;
}

/**
 * Update session activity
 */
export async function updateSessionActivity(sessionId) {
  await query(
    `UPDATE sessions SET last_activity = NOW() WHERE id = $1`,
    [sessionId]
  );
}

/**
 * Invalidate session
 */
export async function invalidateSession(sessionId) {
  await query(
    `UPDATE sessions SET is_active = FALSE WHERE id = $1`,
    [sessionId]
  );
}

/**
 * Invalidate all sessions for a user (force logout)
 */
export async function invalidateUserSessions(userId) {
  await query(
    `UPDATE sessions SET is_active = FALSE WHERE user_id = $1`,
    [userId]
  );
}

/**
 * Cleanup expired sessions
 */
export async function cleanupExpiredSessions() {
  await query(
    `DELETE FROM sessions WHERE expires_at < NOW() OR (refresh_expires_at < NOW() AND refresh_expires_at IS NOT NULL)`
  );
}

export default { ensureSessionsSchema, createSession, getUserSessions, updateSessionActivity, invalidateSession, invalidateUserSessions };
