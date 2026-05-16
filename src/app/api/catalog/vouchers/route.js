import { query } from '@/lib/db';
import { successResponse, errorResponse, validationError } from '@/lib/apiResponse';
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
    const where = search ? `WHERE code ILIKE $1` : '';
    if (search) params.push(`%${search}%`);

    const count = await query(`SELECT COUNT(*) FROM vouchers ${where}`, params);
    params.push(pageSize, offset);
    const result = await query(
      `SELECT id, code, value, min_order, expiry_date, used_count, is_active, created_at
       FROM vouchers
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
    if (!body.code?.trim()) return validationError({ code: 'Code is required' });

    const result = await query(
      `INSERT INTO vouchers (code, value, min_order, expiry_date, used_count, is_active)
       VALUES ($1, $2, $3, $4, COALESCE($5, 0), COALESCE($6, true)) RETURNING *`,
      [body.code.trim(), body.value || 0, body.min_order || 0, body.expiry_date || null, body.used_count ?? 0, body.is_active ?? true]
    );

    return successResponse(result.rows[0], 'Voucher created successfully', 201);
  } catch (err) {
    if (err.code === '23505') return errorResponse('Voucher already exists', 409);
    return errorResponse(err.message);
  }
}