import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureRolesSchema } from '@/lib/rolesSchema';

function normalizePermissions(input) {
  if (Array.isArray(input)) return input.filter(Boolean);
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function mapRoleRow(row) {
  return {
    id: row.id,
    roleId: row.id,
    roleName: row.role_name,
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    description: row.description || '',
    createdAt: row.created_at,
  };
}

export async function GET() {
  try {
    await ensureRolesSchema();

    const res = await query(
      `SELECT id, role_name, permissions, description, created_at
       FROM roles
       ORDER BY created_at DESC, id DESC`
    );

    return NextResponse.json(res.rows.map(mapRoleRow));
  } catch (err) {
    console.error('[employee roles GET]', err.message);
    return NextResponse.json([]);
  }
}

export async function POST(request) {
  try {
    await ensureRolesSchema();

    const body = await request.json();
    const roleName = String(body.role_name || body.roleName || '').trim();
    const permissions = normalizePermissions(body.permissions || body.permission || []);
    const description = String(body.description || '').trim();

    if (!roleName) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    if (permissions.length === 0) {
      return NextResponse.json({ error: 'Permission is required' }, { status: 400 });
    }

    const res = await query(
      `INSERT INTO roles (role_name, permissions, description, meta, created_at, updated_at)
       VALUES ($1, $2::jsonb, $3, $4::jsonb, NOW(), NOW())
       RETURNING id, role_name, permissions, description, created_at`,
      [roleName, JSON.stringify(permissions), description || null, JSON.stringify(body)]
    );

    return NextResponse.json(mapRoleRow(res.rows[0]), { status: 201 });
  } catch (err) {
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Role name already exists' }, { status: 409 });
    }

    console.error('[employee roles POST]', err.message);
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await ensureRolesSchema();

    const body = await request.json();
    const id = Number(body.id);
    const roleName = String(body.role_name || body.roleName || '').trim();
    const permissions = normalizePermissions(body.permissions || body.permission || []);
    const description = String(body.description || '').trim();

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: 'Role id is required' }, { status: 400 });
    }

    if (!roleName) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    if (permissions.length === 0) {
      return NextResponse.json({ error: 'Permission is required' }, { status: 400 });
    }

    const res = await query(
      `UPDATE roles
       SET role_name = $1,
           permissions = $2::jsonb,
           description = $3,
           meta = $4::jsonb,
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, role_name, permissions, description, created_at`,
      [roleName, JSON.stringify(permissions), description || null, JSON.stringify(body), id]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json(mapRoleRow(res.rows[0]));
  } catch (err) {
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Role name already exists' }, { status: 409 });
    }

    console.error('[employee roles PUT]', err.message);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await ensureRolesSchema();

    const url = new URL(request.url);
    const id = Number(url.searchParams.get('id'));

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: 'Role id is required' }, { status: 400 });
    }

    const res = await query('DELETE FROM roles WHERE id = $1 RETURNING id', [id]);

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('[employee roles DELETE]', err.message);
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
  }
}
