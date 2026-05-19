import { query } from '@/lib/db';
import { successResponse, errorResponse, notFoundError, validationError } from '@/lib/api-response';

export async function GET(request, ctx) {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const id = parts[parts.length - 1];
    const result = await query(
      `SELECT t.id, t.name, t.description, t.is_active, t.created_at, t.manufacturer_id, COALESCE(m.name, '—') AS manufacturer_name
       FROM brands t
       LEFT JOIN manufacturers m ON t.manufacturer_id = m.id
       WHERE t.id = $1::int`,
      [id]
    );

    if (!result.rows.length) return notFound('Brand not found');
    return successResponse(result.rows[0]);
  } catch (err) {
    return errorResponse(err.message);
  }
}

export async function PUT(request) {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const id = parts[parts.length - 1];
    const body = await request.json();

    if (!body.name || !body.name.trim()) {
      return validationError({ name: 'Name is required' });
    }

    const result = await query(
      `UPDATE brands SET name = $1, description = $2, manufacturer_id = $3, is_active = COALESCE($4, true)
       WHERE id = $5::int RETURNING *`,
      [body.name?.trim(), body.description || null, body.manufacturer_id || null, body.is_active ?? true, id]
    );

    if (!result.rows.length) return notFound('Brand not found');
    return successResponse(result.rows[0], 'Brand updated successfully');
  } catch (err) {
    if (err.code === '23505') return errorResponse('Brand already exists', 409);
    return errorResponse(err.message);
  }
}

export async function DELETE(request) {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const id = parts[parts.length - 1];
    const result = await query(`DELETE FROM brands WHERE id = $1::int RETURNING *`, [id]);
    if (!result.rows.length) return notFound('Brand not found');
    return successResponse(null, 'Brand deleted');
  } catch (err) {
    return errorResponse(err.message);
  }
}
