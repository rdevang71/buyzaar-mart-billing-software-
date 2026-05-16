import { query } from '@/lib/db';
import { successResponse, errorResponse, notFound, validationError } from '@/lib/apiResponse';

const SELECT = `
  SELECT
    c.id, c.name, c.description, c.image_url,
    c.sort_sequence, c.category_type, c.is_active,
    c.department_id, d.name AS department_name,
    c.created_at, c.updated_at
  FROM categories c
  LEFT JOIN departments d ON c.department_id = d.id
`;

// ─── GET /api/catalog/categories/[id] ────────────────────────
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const result = await query(`${SELECT} WHERE c.id = $1`, [id]);
    if (!result.rows.length) return notFound('Category not found');
    return successResponse(result.rows[0]);
  } catch (err) {
    return errorResponse(err.message);
  }
}

// ─── PUT /api/catalog/categories/[id] ────────────────────────
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.name?.trim()) {
      return validationError({ name: 'Category name is required' });
    }

    const result = await query(
      `UPDATE categories SET
        name          = $1,
        description   = $2,
        image_url     = $3,
        sort_sequence = $4,
        department_id = $5,
        category_type = $6,
        is_active     = $7,
        updated_at    = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        body.name.trim(),
        body.description   || null,
        body.image_url     || null,
        body.sort_sequence ?? 0,
        body.department_id || null,
        body.category_type || 'OTHER',
        body.is_active     ?? true,
        id,
      ]
    );

    if (!result.rows.length) return notFound('Category not found');
    return successResponse(result.rows[0], 'Category updated successfully');
  } catch (err) {
    if (err.code === '23505') return errorResponse('Category already exists', 409);
    return errorResponse(err.message);
  }
}

// ─── DELETE /api/catalog/categories/[id] ─────────────────────
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const result = await query(
      `DELETE FROM categories WHERE id = $1 RETURNING id`,
      [id]
    );
    if (!result.rows.length) return notFound('Category not found');
    return successResponse({ id }, 'Category deleted successfully');
  } catch (err) {
    return errorResponse(err.message);
  }
}