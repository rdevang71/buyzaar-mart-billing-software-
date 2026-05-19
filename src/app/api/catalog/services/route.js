import { query } from '@/lib/db';
import { successResponse, errorResponse, validationError } from '@/lib/api-response';
import { ensureCatalogExtrasSchema } from '@/lib/catalogExtrasSchema';

export async function GET(request) {
  try {
    await ensureCatalogExtrasSchema();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const offset = (page - 1) * pageSize;

    const params = [];
    const where = search ? `WHERE s.name ILIKE $1 OR COALESCE(sg.name, '') ILIKE $1 OR COALESCE(sd.name, '') ILIKE $1` : '';
    if (search) params.push(`%${search}%`);

    const count = await query(
      `SELECT COUNT(*) FROM services s
       LEFT JOIN service_groups sg ON s.service_group_id = sg.id
       LEFT JOIN service_departments sd ON s.service_department_id = sd.id
       ${where}`,
      params
    );
    params.push(pageSize, offset);
    const result = await query(
      `SELECT s.id, s.name, s.price, s.duration_minutes, s.is_active, s.created_at,
              sg.name AS service_group_name,
              sd.name AS service_department_name
       FROM services s
       LEFT JOIN service_groups sg ON s.service_group_id = sg.id
       LEFT JOIN service_departments sd ON s.service_department_id = sd.id
       ${where}
       ORDER BY s.id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return successResponse({
      records: result.rows,
      total: parseInt(count.rows[0].count),
      page,
      pageSize,
      totalPages: Math.ceil(parseInt(count.rows[0].count) / pageSize),
    });
  } catch (err) {
    return errorResponse(err.message);
  }
}

export async function POST(request) {
  try {
    await ensureCatalogExtrasSchema();
    const body = await request.json();
    if (!body.name?.trim()) return validationError({ name: 'Name is required' });

    const result = await query(
      `INSERT INTO services (name, service_group_id, service_department_id, price, duration_minutes, is_active)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, true)) RETURNING *`,
      [body.name.trim(), body.service_group_id || null, body.service_department_id || null, body.price || 0, body.duration_minutes || 0, body.is_active ?? true]
    );

    return successResponse(result.rows[0], 'Service created successfully', 201);
  } catch (err) {
    if (err.code === '23505') return errorResponse('Service already exists', 409);
    return errorResponse(err.message);
  }
}
