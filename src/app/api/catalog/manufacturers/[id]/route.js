import { query } from '@/lib/db';
import { successResponse, errorResponse, notFound, validationError } from '@/lib/apiResponse';

// ─── GET /api/catalog/manufacturers/[id] ────────────────────────
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const result = await query(
      `SELECT id, name, contact, email, phone, address, is_active, created_at
       FROM manufacturers
       WHERE id = $1`,
      [id]
    );

    if (!result.rows.length) return notFound('Manufacturer not found');
    return successResponse(result.rows[0]);
  } catch (err) {
    return errorResponse(err.message);
  }
}

// ─── PUT /api/catalog/manufacturers/[id] ────────────────────────
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.name?.trim()) {
      return validationError({ name: 'Manufacturer name is required' });
    }

    const result = await query(
      `UPDATE manufacturers SET
        name = $1,
        contact = $2,
        email = $3,
        phone = $4,
        address = $5,
        is_active = $6
       WHERE id = $7
       RETURNING id, name, contact, email, phone, address, is_active, created_at`,
      [
        body.name.trim(),
        body.contact || null,
        body.email || null,
        body.phone || null,
        body.address || null,
        body.is_active ?? true,
        id,
      ]
    );

    if (!result.rows.length) return notFound('Manufacturer not found');
    return successResponse(result.rows[0], 'Manufacturer updated successfully');
  } catch (err) {
    if (err.code === '23505') {
      return errorResponse('Manufacturer already exists', 409);
    }
    return errorResponse(err.message);
  }
}

// ─── DELETE /api/catalog/manufacturers/[id] ─────────────────────
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const result = await query(
      `DELETE FROM manufacturers WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!result.rows.length) return notFound('Manufacturer not found');
    return successResponse({ id }, 'Manufacturer deleted successfully');
  } catch (err) {
    return errorResponse(err.message);
  }
}