import { cookies } from 'next/headers';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { verifyAuthToken } from '@/lib/auth';
import { ensureUsersTable } from '@/lib/userAuth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    await ensureUsersTable();

    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return errorResponse('Unauthorized', 401);
    }

    let payload;
    try {
      payload = verifyAuthToken(token);
    } catch {
      return errorResponse('Unauthorized', 401);
    }

    const result = await query(
      `SELECT id, name, email, phone, role, is_active
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [payload.sub]
    );

    const user = result.rows[0];

    if (!user || !user.is_active) {
      return errorResponse('Unauthorized', 401);
    }

    return successResponse({ user }, 'Authenticated');
  } catch (err) {
    return errorResponse(err.message || 'Unable to fetch current user');
  }
}
