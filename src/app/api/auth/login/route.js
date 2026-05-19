import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { signAccessToken, signRefreshToken, createTokenPayload } from '@/lib/auth-enhanced';
import { successResponse, unauthorizedError, validationError } from '@/lib/api-response';
import { query } from '@/lib/db';
import { rateLimiters, rateLimitHeaders } from '@/lib/rate-limiter';
import { getUserIP } from '@/lib/api-protection';

export async function POST(request) {
  try {
    console.log('[LOGIN] Request received');
    
    // ============================================
    // STEP 0: PARSE REQUEST BODY
    // ============================================
    
    let body;
    try {
      body = await request.json();
      console.log('[LOGIN] Body parsed:', { 
        email: body.email, 
        password: body.password ? '***' : 'undefined',
        bodyKeys: Object.keys(body)
      });
    } catch (err) {
      console.error('[LOGIN] JSON parse error:', err.message);
      return validationError({
        field: 'body',
        message: 'Invalid JSON in request body',
      });
    }

    const { email, password } = body;

    // ============================================
    // STEP 0.5: RATE LIMITING
    // ============================================

    const userIP = getUserIP(request);
    const limiter = rateLimiters.login.check(userIP);

    if (!limiter.allowed) {
      console.warn('[LOGIN] Rate limit exceeded from IP:', userIP);
      const response = NextResponse.json(
        {
          success: false,
          message: `Too many login attempts. Please try again after ${limiter.resetTime.toLocaleTimeString()}`,
        },
        { status: 429 }
      );
      Object.entries(rateLimitHeaders(limiter)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // ============================================
    // STEP 1: VALIDATE INPUT
    // ============================================

    console.log('[LOGIN] Validating input:', { 
      hasEmail: !!email, 
      hasPassword: !!password,
      emailType: typeof email,
      passwordType: typeof password
    });

    if (!email || !password) {
      console.error('[LOGIN] Validation failed - missing fields', { 
        email: email || 'MISSING', 
        password: password ? 'PROVIDED' : 'MISSING'
      });
      return validationError({
        field: 'email/password',
        message: 'Email and password are required',
      });
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      console.error('[LOGIN] Invalid field types');
      return validationError({
        field: 'email/password',
        message: 'Email and password must be strings',
      });
    }

    // ============================================
    // STEP 2: FIND USER IN users_v2 TABLE
    // ============================================

    console.log('[LOGIN] Searching for user:', { email: email.toLowerCase() });

    let userResult;
    try {
      userResult = await query(
        `SELECT u.*, r.name as role_name 
         FROM users_v2 u
         LEFT JOIN roles r ON u.role_id = r.id
         WHERE LOWER(u.email) = LOWER($1) AND u.is_active = TRUE`,
        [email]
      );
      console.log('[LOGIN] User query result:', { 
        found: userResult.rows.length > 0,
        rowCount: userResult.rows.length
      });
    } catch (err) {
      console.error('[LOGIN] Database query error:', err.message);
      return NextResponse.json(
        { error: 'Database error: ' + err.message },
        { status: 500 }
      );
    }

    if (userResult.rows.length === 0) {
      console.warn('[LOGIN] User not found:', email);
      return unauthorizedError('Invalid email or password');
    }

    const user = userResult.rows[0];
    console.log('[LOGIN] User found:', { 
      id: user.id, 
      email: user.email,
      role_id: user.role_id,
      role_name: user.role_name,
      is_active: user.is_active,
      is_locked: user.is_locked
    });

    // ============================================
    // STEP 3: CHECK IF ACCOUNT IS LOCKED
    // ============================================

    if (user.is_locked && user.locked_until && user.locked_until > new Date()) {
      console.warn('[LOGIN] Account is locked:', { 
        email, 
        lockedUntil: user.locked_until 
      });
      return unauthorizedError('Account is locked. Try again later.');
    }

    // ============================================
    // STEP 4: VERIFY PASSWORD
    // ============================================

    console.log('[LOGIN] Verifying password');

    let isPasswordValid;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password_hash);
      console.log('[LOGIN] Password verification result:', { 
        isValid: isPasswordValid,
        hashExists: !!user.password_hash
      });
    } catch (err) {
      console.error('[LOGIN] Bcrypt comparison error:', err.message);
      return NextResponse.json(
        { error: 'Password verification failed: ' + err.message },
        { status: 500 }
      );
    }

    if (!isPasswordValid) {
      console.warn('[LOGIN] Invalid password for:', email);
      
      // Increment failed login attempts
      const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
      const isLocked = newFailedAttempts >= 5;

      console.log('[LOGIN] Failed attempt logged:', { 
        newFailedAttempts,
        isLocked,
        email
      });

      try {
        await query(
          `UPDATE users_v2 
           SET failed_login_attempts = $1,
               is_locked = $2,
               locked_until = $3
           WHERE id = $4`,
          [
            newFailedAttempts,
            isLocked,
            isLocked ? new Date(Date.now() + 30 * 60 * 1000) : null,
            user.id,
          ]
        );
      } catch (err) {
        console.error('[LOGIN] Failed to update login attempts:', err.message);
      }

      return unauthorizedError('Invalid email or password');
    }

    // ============================================
    // STEP 5: RESET FAILED ATTEMPTS & UPDATE LOGIN TIME
    // ============================================

    console.log('[LOGIN] Resetting failed attempts');

    try {
      await query(
        `UPDATE users_v2 
         SET failed_login_attempts = 0, 
             is_locked = FALSE,
             last_login = NOW()
         WHERE id = $1`,
        [user.id]
      );
    } catch (err) {
      console.error('[LOGIN] Failed to reset login attempts:', err.message);
    }

    // ============================================
    // STEP 6: GET USER'S PERMISSIONS
    // ============================================

    console.log('[LOGIN] Fetching permissions for role_id:', user.role_id);

    let permResult = { rows: [] };
    if (user.role_id) {
      try {
        permResult = await query(
          `SELECT p.name FROM role_permissions rp
           JOIN permissions p ON rp.permission_id = p.id
           WHERE rp.role_id = $1
           ORDER BY p.name`,
          [user.role_id]
        );
        console.log('[LOGIN] Permissions found:', { 
          count: permResult.rows.length,
          permissions: permResult.rows.slice(0, 3).map(p => p.name)
        });
      } catch (err) {
        console.error('[LOGIN] Failed to fetch permissions:', err.message);
      }
    } else {
      console.warn('[LOGIN] User has no role_id assigned');
    }

    const permissions = permResult.rows.map((p) => p.name);

    // ============================================
    // STEP 7: GET USER'S ASSIGNED STORES
    // ============================================

    console.log('[LOGIN] Fetching assigned stores');

    let storesResult = { rows: [] };
    try {
      storesResult = await query(
        `SELECT store_id FROM user_stores 
         WHERE user_id = $1 AND is_active = TRUE
         ORDER BY store_id`,
        [user.id]
      );
      console.log('[LOGIN] Stores found:', { 
        count: storesResult.rows.length,
        stores: storesResult.rows.map(s => s.store_id)
      });
    } catch (err) {
      console.warn('[LOGIN] user_stores table does not exist or query failed:', err.message);
      // This is OK - user_stores table is optional
    }

    const assignedStores = storesResult.rows.map((s) => s.store_id);

    // ============================================
    // STEP 8: CREATE TOKEN PAYLOAD
    // ============================================

    console.log('[LOGIN] Creating token payload');

    const tokenPayload = createTokenPayload({
      id: user.id,
      email: user.email,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      role: user.role_name || 'user',
      permissions,
      assigned_stores: assignedStores,
    });

    console.log('[LOGIN] Token payload created:', { 
      sub: tokenPayload.sub,
      role: tokenPayload.role,
      permissionCount: tokenPayload.permissions.length
    });

    // ============================================
    // STEP 9: SIGN ACCESS & REFRESH TOKENS
    // ============================================

    console.log('[LOGIN] Signing tokens');

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    console.log('[LOGIN] Tokens signed successfully');

    // ============================================
    // STEP 10: HASH TOKENS FOR SESSION STORAGE
    // ============================================

    const accessTokenHash = crypto
      .createHash('sha256')
      .update(accessToken)
      .digest('hex');

    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // ============================================
    // STEP 11: STORE SESSION IN DATABASE
    // ============================================

    console.log('[LOGIN] Storing session');

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    try {
      await query(
        `INSERT INTO sessions 
         (user_id, access_token_hash, refresh_token_hash, ip_address, user_agent, expires_at, refresh_expires_at)
         VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days', NOW() + INTERVAL '30 days')`,
        [user.id, accessTokenHash, refreshTokenHash, ipAddress, userAgent]
      );
      console.log('[LOGIN] Session stored successfully');
    } catch (err) {
      console.error('[LOGIN] Failed to store session:', err.message);
    }

    // ============================================
    // STEP 12: LOG LOGIN ATTEMPT IN AUDIT
    // ============================================

    console.log('[LOGIN] Logging audit entry');

    try {
      await query(
        `INSERT INTO audit_logs 
         (user_id, action, resource_type, ip_address, user_agent, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, 'LOGIN', 'AUTH', ipAddress, userAgent, 'success']
      );
    } catch (err) {
      console.error('[LOGIN] Failed to log audit entry:', err.message);
    }

    // ============================================
    // STEP 13: REDIRECT TO HOME
    // ============================================

    console.log('[LOGIN] Login successful for:', email);
    console.log('[LOGIN] Redirecting to /home');

    // Create redirect response
    const redirectUrl = new URL('/home', request.url);
    const response = NextResponse.redirect(redirectUrl, { status: 302 });

    // ============================================
    // STEP 14: SET COOKIES ON REDIRECT
    // ============================================

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    console.log('[LOGIN] Cookies set, redirecting');
    
    // Reset rate limit on successful login
    rateLimiters.login.reset(userIP);

    return response;

  } catch (err) {
    console.error('[LOGIN] Unhandled error:', err);
    console.error('[LOGIN] Error message:', err.message);
    console.error('[LOGIN] Error stack:', err.stack);

    // Log failed attempt
    try {
      const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      await query(
        `INSERT INTO audit_logs 
         (action, resource_type, ip_address, user_agent, status, error_message)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['LOGIN_FAILED', 'AUTH', ipAddress, userAgent, 'error', err.message]
      );
    } catch (auditErr) {
      console.error('[LOGIN] Failed to log error to audit:', auditErr.message);
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Login failed'
      },
      { status: 500 }
    );
  }
}

/**
 * TESTING THIS ENDPOINT
 * =====================
 * 
 * POST /api/auth/login
 * Content-Type: application/json
 * 
 * {
 *   "email": "admin@billingpro.com",
 *   "password": "admin@123"
 * }
 * 
 * Expected: 302 Redirect to /home with access_token & refresh_token cookies
 */
