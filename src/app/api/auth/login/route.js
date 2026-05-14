import bcrypt from 'bcryptjs';
import { successResponse, errorResponse, validationError } from '@/lib/apiResponse';
import { query } from '@/lib/db';
import { signAuthToken } from '@/lib/auth';
import { ensureUsersTable, normalizePhone } from '@/lib/userAuth';

export async function POST(request) {
  try {
    await ensureUsersTable();

    const body = await request.json();
    const emailOrPhone =
      body?.emailOrPhone?.trim() ||
      body?.email?.trim() ||
      body?.phone?.trim() ||
      '';
    const password = body?.password || '';

    if (!emailOrPhone || !password) {
      return validationError({ emailOrPhone: 'Email/phone and password are required' });
    }

    const normalizedPhone = normalizePhone(emailOrPhone);

    const result = await query(
      `SELECT id, name, email, phone, password_hash, role, is_active
       FROM users
       WHERE LOWER(email) = LOWER($1) OR phone = $2
       LIMIT 1`,
      [emailOrPhone.toLowerCase(), normalizedPhone]
    );

    const user = result.rows[0];

    if (!user) {
      return errorResponse('Invalid credentials', 401);
    }

    if (!user.is_active) {
      return errorResponse('Your account is inactive. Contact admin.', 403);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return errorResponse('Invalid credentials', 401);
    }

    const token = signAuthToken({
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    const response = successResponse(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      },
      'Login successful'
    );

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    return errorResponse(err.message || 'Unable to login');
  }
}
