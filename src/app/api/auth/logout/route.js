import { successResponse } from '@/lib/apiResponse';

export async function POST() {
  const response = successResponse({}, 'Logged out successfully');

  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
