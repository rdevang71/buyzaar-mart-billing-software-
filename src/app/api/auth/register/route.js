import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { successResponse, errorResponse, validationError } from '@/lib/apiResponse';
import { ensureUsersTable, normalizeEmail, normalizePhone } from '@/lib/userAuth';
import { signAuthToken } from '@/lib/auth';

export async function POST(request) {
  try {
    await ensureUsersTable();

    const body = await request.json();
    const name = body?.name?.trim() || '';
    const email = normalizeEmail(body?.email || '');
    const phone = normalizePhone(body?.phone || '');
    const password = body?.password || '';
    const confirmPassword = body?.confirmPassword || '';

    const errors = {};

    if (!name) errors.name = 'Name is required';
    if (!email) errors.email = 'Email is required';
    if (!phone) errors.phone = 'Phone number is required';
    if (phone && phone.length < 10) errors.phone = 'Phone number must be at least 10 digits';
    if (!password) errors.password = 'Password is required';
    if (password && password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';

    if (Object.keys(errors).length) {
      return validationError(errors);
    }

    const existing = await query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) OR phone = $2 LIMIT 1`,
      [email, phone]
    );

    if (existing.rows.length) {
      return validationError({ account: 'Email or phone is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (name, email, phone, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'user', TRUE, NOW(), NOW())
       RETURNING id, name, email, phone, role, is_active, created_at`,
      [name, email, phone, passwordHash]
    );

    const user = result.rows[0];
    const token = signAuthToken({
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    const response = successResponse({ user }, 'Registration successful', 201);

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    if (err.code === '23505') {
      return validationError({ account: 'Email or phone is already registered' });
    }

    return errorResponse(err.message || 'Unable to register user');
  }
}
