import { query } from '@/lib/db';
import { successResponse, errorResponse, notFoundError, validationError } from '@/lib/api-response';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const id = parts[parts.length - 1];

    const result = await query(
      `SELECT id, name, code, is_active, created_at
       FROM income_heads
       WHERE id = $1::int`,
      [id]
    );

    if (!result.rows.length) return notFound('Income Head not found');
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
      `UPDATE income_heads SET name = $1, code = $2, is_active = COALESCE($3, true)
       WHERE id = $4::int RETURNING *`,
      [body.name?.trim(), body.code || null, body.is_active ?? true, id]
    );

    if (!result.rows.length) return notFound('Income Head not found');
    return successResponse(result.rows[0], 'Income Head updated successfully');
  } catch (err) {
    if (err.code === '23505') return errorResponse('Income Head already exists', 409);
    return errorResponse(err.message);
  }
}

export async function DELETE(request) {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const id = parts[parts.length - 1];
    const result = await query(`DELETE FROM income_heads WHERE id = $1::int RETURNING *`, [id]);
    if (!result.rows.length) return notFound('Income Head not found');
    return successResponse(null, 'Income Head deleted');
  } catch (err) {
    return errorResponse(err.message);
  }
}
