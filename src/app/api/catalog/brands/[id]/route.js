import { query } from '@/lib/db';
import { successResponse, errorResponse, notFoundError, validationError } from '@/lib/api-response';

async function ensureBrandExtras() {
  await query(`ALTER TABLE brands ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL`);
  await query(`ALTER TABLE brands ADD COLUMN IF NOT EXISTS margin NUMERIC(7,2) NOT NULL DEFAULT 0`);
}

function getIdFromRequest(request) {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

export async function GET(request) {
  try {
    await ensureBrandExtras();
    const id = getIdFromRequest(request);
    const result = await query(
      `SELECT t.id, t.name, t.description, t.is_active, t.created_at,
              t.manufacturer_id, t.category_id, COALESCE(t.margin, 0) AS margin,
              COALESCE(m.name, '-') AS manufacturer_name,
              COALESCE(c.name, '-') AS category_name
       FROM brands t
       LEFT JOIN manufacturers m ON t.manufacturer_id = m.id
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = $1::int`,
      [id]
    );

    if (!result.rows.length) return notFoundError('Brand not found');
    return successResponse(result.rows[0]);
  } catch (err) {
    return errorResponse(err.message);
  }
}

export async function PUT(request) {
  try {
    await ensureBrandExtras();
    const id = getIdFromRequest(request);
    const body = await request.json();

    if (!body.name || !body.name.trim()) {
      return validationError({ name: 'Name is required' });
    }

    const result = await query(
      `UPDATE brands
       SET name = $1,
           description = $2,
           manufacturer_id = $3,
           category_id = $4,
           margin = $5,
           is_active = COALESCE($6, true)
       WHERE id = $7::int
       RETURNING *`,
      [
        body.name?.trim(),
        body.description || null,
        body.manufacturer_id || null,
        body.category_id || null,
        Number(body.margin || 0),
        body.is_active ?? true,
        id,
      ]
    );

    if (!result.rows.length) return notFoundError('Brand not found');
    return successResponse(result.rows[0], 'Brand updated successfully');
  } catch (err) {
    if (err.code === '23505') return errorResponse('Brand already exists', 409);
    return errorResponse(err.message);
  }
}

export async function DELETE(request) {
  try {
    const id = getIdFromRequest(request);
    const result = await query(`DELETE FROM brands WHERE id = $1::int RETURNING *`, [id]);
    if (!result.rows.length) return notFoundError('Brand not found');
    return successResponse(null, 'Brand deleted');
  } catch (err) {
    return errorResponse(err.message);
  }
}
