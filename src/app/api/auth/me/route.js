import { cookies } from 'next/headers';
import { successResponse, errorResponse } from '@/lib/api-response';
import { verifyToken } from '@/lib/auth-enhanced';
import { query } from '@/lib/db';
import { ensureUsersTable } from '@/lib/userAuth';
import { ensureRolesSchema } from '@/lib/rolesSchema';

export async function GET() {
  try {
    await ensureUsersTable();
    await ensureRolesSchema();

    const cookieStore = await cookies();
    
    // Check for access_token (new system) or auth_token (legacy)
    const token = cookieStore.get('access_token')?.value || 
                  cookieStore.get('auth_token')?.value;

    if (!token) {
      return successResponse({ user: null }, 'Not authenticated');
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      return successResponse({ user: null }, 'Not authenticated');
    }

    if (!payload?.sub) {
      return successResponse({ user: null }, 'Not authenticated');
    }

    const result = await query(
      `SELECT id, name, email, phone, role, is_active
       FROM users
       WHERE id = $1 AND is_active = TRUE
       LIMIT 1`,
      [payload.sub]
    );

    const dbUser = result.rows[0];

    if (!dbUser) {
      return successResponse({ user: null }, 'Not authenticated');
    }

    const roleResult = await query(
      `SELECT permissions FROM roles WHERE role_name = $1 LIMIT 1`,
      [dbUser.role || 'user']
    );

    const storesResult = await query(
      `SELECT us.store_id, s.name AS store_name
       FROM user_stores us
       LEFT JOIN stores s ON s.id = us.store_id
       WHERE us.user_id = $1 AND us.is_active = TRUE
       ORDER BY s.name ASC, us.store_id ASC`,
      [dbUser.id]
    );

    // Construct user object from token + latest database access rules
    const user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || dbUser.email,
      role: dbUser.role || 'user',
      permissions: Array.isArray(roleResult.rows[0]?.permissions)
        ? roleResult.rows[0].permissions
        : payload.permissions || [],
      assigned_stores: storesResult.rows.map((row) => Number(row.store_id)),
      assigned_store_names: storesResult.rows
        .map((row) => row.store_name)
        .filter(Boolean),
    };

    return successResponse({ user }, 'Authenticated');
  } catch (err) {
    console.error('[AUTH/ME] Error:', err.message);
    return errorResponse(err.message || 'Unable to fetch current user');
  }
}
