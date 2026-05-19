import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { errorResponse, successResponse, validationError } from '@/lib/api-response';
import { verifyAuthToken } from '@/lib/auth';
import { ensureUsersTable } from '@/lib/userAuth';
import { query } from '@/lib/db';

export async function POST(request) {
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

    const body = await request.json();
    const currentPassword = body?.currentPassword || '';
    const newPassword = body?.newPassword || '';
    const confirmPassword = body?.confirmPassword || '';

    const errors = {};
    if (!currentPassword) errors.currentPassword = 'Current password is required';
    if (!newPassword) errors.newPassword = 'New password is required';
    if (newPassword && newPassword.length < 8) errors.newPassword = 'New password must be at least 8 characters';
    if (newPassword !== confirmPassword) errors.confirmPassword = 'New passwords do not match';

    if (Object.keys(errors).length) {
      return validationError(errors);
    }

    const userResult = await query(
      `SELECT id, password_hash, is_active FROM users WHERE id = $1 LIMIT 1`,
      [payload.sub]
    );
    const user = userResult.rows[0];

    if (!user || !user.is_active) {
      return errorResponse('Unauthorized', 401);
    }

    const matches = await bcrypt.compare(currentPassword, user.password_hash);
    if (!matches) {
      return validationError({ currentPassword: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await query(
      `UPDATE users
       SET password_hash = $1, updated_at = NOW()
       WHERE id = $2`,
      [newHash, user.id]
    );

    return successResponse({}, 'Password changed successfully');
  } catch (err) {
    return errorResponse(err.message || 'Unable to change password');
  }
}
