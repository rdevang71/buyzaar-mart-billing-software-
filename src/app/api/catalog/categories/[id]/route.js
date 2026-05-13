import { query } from '@/lib/db';
import { successResponse, errorResponse, notFound, validationError } from '@/lib/apiResponse';

// ─── GET /api/catalog/categories/[id] ──────────────────────────
export async function GET(request, { params }) {
  try {
    const result = await query(
      `SELECT id, name, description, is_active, created_at FROM categories t WHERE t.id = $1`,
      [params.id]
    );
    if (!result.rows.length) return notFound('Category not found');
    return successResponse(result.rows[0]);
  } catch (err) {
    return errorResponse(err.message);
  }
}

// ─── PUT /api/catalog/categories/[id] ──────────────────────────
export async function PUT(request, { params }) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return validationError({ name: 'Name is required' });
    }

    const result = await query(
      `UPDATE categories
       SET name = $1, description = $2, is_active = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [body.name?.trim(), body.description || null, body.is_active ?? true, params.id]
    );

    if (!result.rows.length) return notFound('Category not found');
    return successResponse(result.rows[0], 'Category updated successfully');
  } catch (err) {
    if (err.code === '23505') {
      return errorResponse('Category already exists', 409);
    }
    return errorResponse(err.message);
  }
}

// ─── DELETE /api/catalog/categories/[id] ───────────────────────
export async function DELETE(request, { params }) {
  try {
    const result = await query(
      `DELETE FROM categories WHERE id = $1 RETURNING id`,
      [params.id]
    );
    if (!result.rows.length) return notFound('Category not found');
    return successResponse({ id: params.id }, 'Category deleted successfully');
  } catch (err) {
    return errorResponse(err.message);
  }
}