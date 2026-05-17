import { query } from '@/lib/db';
import { successResponse, errorResponse, notFound, validationError } from '@/lib/apiResponse';
import { ensureCatalogExtrasSchema } from '@/lib/catalogExtrasSchema';

// ─── GET /api/catalog/service-groups/[id] ──────────────────────
export async function GET(request, { params }) {
  try {
    await ensureCatalogExtrasSchema();
    const { id } = await params;
    const result = await query(
      `SELECT id, name, code, sort_sequence, is_active, created_at, updated_at
       FROM service_groups
       WHERE id = $1`,
      [id]
    );

    if (!result.rows.length) return notFound('Service Group not found');
    return successResponse(result.rows[0]);
  } catch (err) {
    return errorResponse(err.message);
  }
}

// ─── PUT /api/catalog/service-groups/[id] ───────────────────────
export async function PUT(request, { params }) {
  try {
    await ensureCatalogExtrasSchema();
    const { id } = await params;
    const body = await request.json();

    if (!body.name?.trim()) {
      return validationError({ name: 'Service Group name is required' });
    }

    const result = await query(
      `UPDATE service_groups SET
        name = $1,
        code = $2,
        sort_sequence = $3,
        is_active = $4,
        updated_at = NOW()
       WHERE id = $5
       RETURNING id, name, code, sort_sequence, is_active, created_at, updated_at`,
      [
        body.name.trim(),
        body.code || null,
        body.sort_sequence ?? 0,
        body.is_active ?? true,
        id,
      ]
    );

    if (!result.rows.length) return notFound('Service Group not found');
    return successResponse(result.rows[0], 'Service Group updated successfully');
  } catch (err) {
    if (err.code === '23505') {
      return errorResponse('Service Group already exists', 409);
    }
    return errorResponse(err.message);
  }
}

// ─── DELETE /api/catalog/service-groups/[id] ────────────────────
export async function DELETE(request, { params }) {
  try {
    await ensureCatalogExtrasSchema();
    const { id } = await params;
    const result = await query(
      `DELETE FROM service_groups WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!result.rows.length) return notFound('Service Group not found');
    return successResponse({ id }, 'Service Group deleted successfully');
  } catch (err) {
    return errorResponse(err.message);
  }
}
