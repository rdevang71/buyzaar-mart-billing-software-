import { cookies } from 'next/headers';
import { successResponse, errorResponse } from '@/lib/api-response';
import { verifyToken } from '@/lib/auth-enhanced';
import { query } from '@/lib/db';

export async function GET() {
  try {
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

    // Query from users_v2 table (new system)
    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, 
              u.role_id, r.name as role_name
       FROM users_v2 u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1 AND u.is_active = TRUE
       LIMIT 1`,
      [payload.sub]
    );

    const dbUser = result.rows[0];

    if (!dbUser) {
      return successResponse({ user: null }, 'Not authenticated');
    }

    // Construct user object from token + database
    const user = {
      id: dbUser.id,
      email: dbUser.email,
      name: `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim() || dbUser.email,
      role: dbUser.role_name || 'user',
      role_id: dbUser.role_id,
      permissions: payload.permissions || [],
      assigned_stores: payload.assigned_stores || [],
    };

    return successResponse({ user }, 'Authenticated');
  } catch (err) {
    console.error('[AUTH/ME] Error:', err.message);
    return errorResponse(err.message || 'Unable to fetch current user');
  }
}
