import { query } from '@/lib/db';
import { successResponse, errorResponse, notFoundError, validationError } from '@/lib/api-response';

// ─── GET /api/catalog/departments/[id] ──────────────────────────
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const result = await query(
      `SELECT id, name, code, is_active, created_at
       FROM departments
       WHERE id = $1`,
      [id]
    );

    if (!result.rows.length) return notFound('Department not found');
    return successResponse(result.rows[0]);
  } catch (err) {
    return errorResponse(err.message);
  }
}

// ─── PUT /api/catalog/departments/[id] ───────────────────────────
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.name?.trim()) {
      return validationError({ name: 'Department name is required' });
    }

    const result = await query(
      `UPDATE departments SET
        name = $1,
        code = $2,
        is_active = $3
       WHERE id = $4
       RETURNING id, name, code, is_active, created_at`,
      [
        body.name.trim(),
        body.code || null,
        body.is_active ?? true,
        id,
      ]
    );

    if (!result.rows.length) return notFound('Department not found');
    // handle category associations when provided
    if (Array.isArray(body.category_ids)) {
      // assign selected categories to this department
      if (body.category_ids.length) {
        await query(
          `UPDATE categories SET department_id = $1 WHERE id = ANY($2::bigint[])`,
          [id, body.category_ids]
        );
      }
      // clear department_id for categories previously assigned but not in the new list
      await query(
        `UPDATE categories SET department_id = NULL WHERE department_id = $1 AND (NOT (id = ANY($2::bigint[])))`,
        [id, body.category_ids.length ? body.category_ids : [-1]]
      );
    }
    return successResponse(result.rows[0], 'Department updated successfully');
  } catch (err) {
    if (err.code === '23505') {
      return errorResponse('Department already exists', 409);
    }
    return errorResponse(err.message);
  }
}

// ─── DELETE /api/catalog/departments/[id] ────────────────────────
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const result = await query(
      `DELETE FROM departments WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!result.rows.length) return notFound('Department not found');
    return successResponse({ id }, 'Department deleted successfully');
  } catch (err) {
    return errorResponse(err.message);
  }
}
