import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensurePermissionsSchema } from '@/lib/permissionsSchema';

function mapPermissionRow(row) {
  return {
    id: row.id,
    permissionForOrg: row.permission_for_org,
    permissionForInterface: row.permission_for_interface,
    permissionName: row.permission_name,
    displayName: row.display_name || '',
    description: row.description || '',
    createdAt: row.created_at,
  };
}

export async function GET() {
  try {
    await ensurePermissionsSchema();

    const res = await query(
      `SELECT id, permission_for_org, permission_for_interface, permission_name, display_name, description, created_at
       FROM permissions
       ORDER BY created_at DESC, id DESC`
    );

    return NextResponse.json(res.rows.map(mapPermissionRow));
  } catch (err) {
    console.error('[employee permissions GET]', err.message);
    return NextResponse.json([]);
  }
}

export default null;
