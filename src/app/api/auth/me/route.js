import { cookies } from 'next/headers';
import { successResponse, errorResponse } from '@/lib/api-response';
import { verifyToken } from '@/lib/auth-enhanced';
import { query } from '@/lib/db';
import { ensureUsersTable } from '@/lib/userAuth';

export async function GET() {
  try {
    await ensureUsersTable();

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

    // Construct user object from token + database
    const user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || dbUser.email,
      role: dbUser.role || 'user',
      permissions: payload.permissions || [],
      assigned_stores: payload.assigned_stores || [],
    };

    return successResponse({ user }, 'Authenticated');
  } catch (err) {
    console.error('[AUTH/ME] Error:', err.message);
    return errorResponse(err.message || 'Unable to fetch current user');
  }
}
