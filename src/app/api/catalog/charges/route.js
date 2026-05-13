import { query } from '@/lib/db';
import { successResponse, errorResponse, notFound, validationError } from '@/lib/apiResponse';

// ─── GET /api/catalog/charges ───────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search   = searchParams.get('search')   || '';
    const page     = parseInt(searchParams.get('page')     || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const offset   = (page - 1) * pageSize;

    const whereClause = search
      ? `WHERE t.name ILIKE $3`
      : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM charges t ${whereClause}`,
      search ? [`%${search}%`] : []
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT id, name, charge_type, amount, is_active, created_at
       FROM charges t
       ${whereClause}
       ORDER BY t.id DESC
       LIMIT $1 OFFSET $2`,
      search
        ? [pageSize, offset, `%${search}%`]
        : [pageSize, offset]
    );

    return successResponse({
      records: result.rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    return errorResponse(err.message);
  }
}

// ─── POST /api/catalog/charges ──────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return validationError({ name: 'Name is required' });
    }

    const result = await query(
      `INSERT INTO charges (name, charge_type, amount, is_active)
       VALUES ($1, COALESCE($2,'FIXED'), COALESCE($3,0), COALESCE($4, true))
       RETURNING *`,
      [body.name?.trim(), body.charge_type || 'FIXED', body.amount || 0, body.is_active ?? true]
    );

    return successResponse(result.rows[0], 'Charge created successfully', 201);
  } catch (err) {
    if (err.code === '23505') {
      return errorResponse('Charge already exists', 409);
    }
    return errorResponse(err.message);
  }
}