import { NextResponse } from 'next/server';
import { ensureUsersTable } from '@/lib/userAuth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    await ensureUsersTable();

    const res = await query(
      `SELECT id, name, email, phone, role, is_active
       FROM users
       WHERE is_active = TRUE
       ORDER BY name ASC, id ASC`
    );

    return NextResponse.json(
      res.rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        role: row.role,
      }))
    );
  } catch (err) {
    console.error('[auth users GET]', err.message);
    return NextResponse.json([]);
  }
}
