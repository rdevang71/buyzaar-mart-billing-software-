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
    const where = search ? `WHERE name ILIKE $1 OR promotion_type ILIKE $1 OR status ILIKE $1` : '';
    if (search) params.push(`%${search}%`);

    const count = await query(`SELECT COUNT(*) FROM promotions ${where}`, params);
    params.push(pageSize, offset);
    const result = await query(
      `SELECT id, name, promotion_type, discount_value, start_date, end_date, status, created_at
       FROM promotions
       ${where}
       ORDER BY id DESC
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
      `INSERT INTO promotions (name, promotion_type, discount_value, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'Active')) RETURNING *`,
      [body.name.trim(), body.promotion_type || 'Discount', body.discount_value || '0', body.start_date || null, body.end_date || null, body.status || 'Active']
    );

    return successResponse(result.rows[0], 'Promotion created successfully', 201);
  } catch (err) {
    if (err.code === '23505') return errorResponse('Promotion already exists', 409);
    return errorResponse(err.message);
  }
}
