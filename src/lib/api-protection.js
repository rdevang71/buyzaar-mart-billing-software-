/**
 * API PROTECTION LAYER
 * Provides middleware functions for role-based and permission-based access control
 */

import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-enhanced';
import { query } from '@/lib/db';
import { unauthorizedError, forbiddenError } from '@/lib/api-response';

/**
 * Extract and verify JWT token from request
 * Returns { user, token, error }
 */
export async function extractAuthUser(request) {
  try {
    // Get token from cookies or Authorization header
    const cookieToken = request.cookies.get('access_token')?.value || 
                       request.cookies.get('auth_token')?.value;
    
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;
    
    const token = bearerToken || cookieToken;

    if (!token) {
      return { user: null, token: null, error: 'No authentication token provided' };
    }

    // Verify token
    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      return { user: null, token: null, error: 'Invalid or expired token' };
    }

    // Fetch full user from database
    const userResult = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, u.role_id, r.name as role_name
       FROM users_v2 u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1 AND u.is_active = TRUE`,
      [payload.sub]
    );

    if (userResult.rows.length === 0) {
      return { user: null, token: null, error: 'User not found or inactive' };
    }

    const dbUser = userResult.rows[0];
    const user = {
      id: dbUser.id,
      email: dbUser.email,
      name: `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim(),
      role: dbUser.role_name,
      role_id: dbUser.role_id,
      permissions: payload.permissions || [],
      assigned_stores: payload.assigned_stores || [],
    };

    return { user, token, error: null };
  } catch (err) {
    console.error('[API_PROTECTION] Error extracting user:', err.message);
    return { user: null, token: null, error: err.message };
  }
}

/**
 * MIDDLEWARE: Require authentication
 * Must be called at start of protected endpoints
 * 
 * Usage:
 * export async function POST(request) {
 *   const auth = await requireAuth(request);
 *   if (auth.error) return auth.error;
 *   const { user } = auth;
 *   // ... rest of endpoint
 * }
 */
export async function requireAuth(request) {
  const { user, token, error } = await extractAuthUser(request);

  if (error || !user) {
    return {
      error: unauthorizedError(error || 'Authentication required'),
      user: null,
    };
  }

  return { error: null, user };
}

/**
 * MIDDLEWARE: Require specific role(s)
 * 
 * Usage:
 * const auth = await requireAuth(request);
 * if (auth.error) return auth.error;
 * 
 * const roleCheck = requireRole(auth.user, 'super_admin', 'admin');
 * if (roleCheck.error) return roleCheck.error;
 */
export function requireRole(user, ...roles) {
  if (!user) {
    return { error: unauthorizedError('Not authenticated') };
  }

  if (!roles.includes(user.role)) {
    return {
      error: forbiddenError(
        `Access denied. Required role(s): ${roles.join(', ')}, but you are: ${user.role}`
      ),
    };
  }

  return { error: null };
}

/**
 * MIDDLEWARE: Require specific permission(s)
 * 
 * Usage:
 * const auth = await requireAuth(request);
 * const permCheck = requirePermission(auth.user, 'users:create', 'users:edit');
 * if (permCheck.error) return permCheck.error;
 */
export function requirePermission(user, ...permissions) {
  if (!user) {
    return { error: unauthorizedError('Not authenticated') };
  }

  const hasPermission = permissions.some(p => user.permissions.includes(p));

  if (!hasPermission) {
    return {
      error: forbiddenError(
        `Access denied. Required permission(s): ${permissions.join(', ')}`
      ),
    };
  }

  return { error: null };
}

/**
 * MIDDLEWARE: Verify user can access store
 * 
 * Usage:
 * const storeCheck = requireStore(user, storeId);
 * if (storeCheck.error) return storeCheck.error;
 */
export function requireStore(user, storeId) {
  if (!user) {
    return { error: unauthorizedError('Not authenticated') };
  }

  // Super admin can access all stores
  if (user.role === 'super_admin') {
    return { error: null };
  }

  // Check if user is assigned to this store
  if (!user.assigned_stores.includes(Number(storeId))) {
    return {
      error: forbiddenError(
        `You don't have access to store ${storeId}. Assigned stores: ${user.assigned_stores.join(', ')}`
      ),
    };
  }

  return { error: null };
}

/**
 * LOG API ACCESS for audit trail
 */
export async function auditLog(userId, action, resourceType, resourceId = null, details = {}) {
  try {
    await query(
      `INSERT INTO audit_logs 
       (user_id, action, resource_type, resource_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, NOW())`,
      [userId, action, resourceType, resourceId, JSON.stringify(details)]
    );
  } catch (err) {
    console.error('[AUDIT_LOG] Error logging:', err.message);
  }
}

/**
 * Get user's IP address from request
 */
export function getUserIP(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('cf-connecting-ip') ||
         request.headers.get('x-real-ip') ||
         'unknown';
}
