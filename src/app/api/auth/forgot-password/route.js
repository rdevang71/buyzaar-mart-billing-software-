import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { successResponse, validationError, errorResponse } from '@/lib/api-response';
import { query } from '@/lib/db';
import { rateLimiters } from '@/lib/rate-limiter';
import { getUserIP } from '@/lib/api-protection';

/**
 * POST /api/auth/forgot-password
 * Request a password reset token
 * 
 * Body: { email }
 * Response: { success: true, message: "Reset email sent" }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate input
    if (!email || typeof email !== 'string') {
      return validationError({
        field: 'email',
        message: 'Valid email is required',
      });
    }

    const userIP = getUserIP(request);

    // Rate limit: 3 attempts per hour
    const limiter = rateLimiters.forgotPassword.check(userIP);
    if (!limiter.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many password reset requests. Try again after ${limiter.resetTime.toLocaleTimeString()}`,
        },
        { status: 429, headers: {
          'Retry-After': String(Math.ceil((limiter.resetTime - new Date()) / 1000)),
        }}
      );
    }

    // Find user by email
    const userResult = await query(
      `SELECT id, email, first_name FROM users_v2 
       WHERE LOWER(email) = LOWER($1) AND is_active = TRUE`,
      [email]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal if email exists (security best practice)
      console.log('[FORGOT_PASSWORD] User not found:', email);
      return successResponse(
        null,
        'If an account exists with this email, a reset link will be sent.'
      );
    }

    const user = userResult.rows[0];

    // Generate secure reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token in database
    await query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE SET token_hash = $2, expires_at = $3, created_at = NOW()`,
      [user.id, tokenHash, expiresAt]
    );

    // TODO: Send email with reset link
    // resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`
    // await sendEmail(user.email, 'Password Reset Request', { name: user.first_name, resetLink })

    console.log('[FORGOT_PASSWORD] Reset token created for:', user.email);
    console.log('[FORGOT_PASSWORD] Reset token (dev only):', resetToken); // Only for development

    return successResponse(
      null,
      'If an account exists with this email, a reset link will be sent.'
    );

  } catch (err) {
    console.error('[FORGOT_PASSWORD] Error:', err.message);
    return errorResponse('Unable to process password reset request');
  }
}
