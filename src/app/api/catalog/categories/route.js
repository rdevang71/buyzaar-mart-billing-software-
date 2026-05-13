import { query } from '@/lib/db';
import { successResponse, errorResponse, notFound, validationError } from '@/lib/apiResponse';

// ─── GET /api/catalog/categories ───────────────────────────────
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
      `SELECT COUNT(*) FROM categories t ${whereClause}`,
      search ? [`%${search}%`] : []
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT id, name, description, is_active, created_at
       FROM categories t
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

// ─── POST /api/catalog/categories ──────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return validationError({ name: 'Name is required' });
    }

    const result = await query(
      `INSERT INTO categories (name, description, is_active)
       VALUES ($1, $2, COALESCE($3, true))
       RETURNING *`,
      [body.name?.trim(), body.description || null, body.is_active ?? true]
    );

    return successResponse(result.rows[0], 'Category created successfully', 201);
  } catch (err) {
    if (err.code === '23505') {
      return errorResponse('Category already exists', 409);
    }
    return errorResponse(err.message);
  }
}