import { query } from '@/lib/db';
import { successResponse, errorResponse, notFound, validationError } from '@/lib/apiResponse';

// ─── GET /api/catalog/products ───────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search      = searchParams.get('search')   || '';
    const category_id = searchParams.get('category_id') || '';
    const brand_id    = searchParams.get('brand_id')    || '';
    const is_active   = searchParams.get('is_active');
    const page        = parseInt(searchParams.get('page')     || '1');
    const pageSize    = parseInt(searchParams.get('pageSize') || '10');
    const offset      = (page - 1) * pageSize;

    const conditions = [];
    const params = [];
    let i = 1;

    if (search) {
      conditions.push(`(p.name ILIKE $${i} OR p.barcode ILIKE $${i} OR p.sku ILIKE $${i})`);
      params.push(`%${search}%`);
      i++;
    }
    if (category_id) {
      conditions.push(`p.category_id = $${i}`);
      params.push(category_id);
      i++;
    }
    if (brand_id) {
      conditions.push(`p.brand_id = $${i}`);
      params.push(brand_id);
      i++;
    }
    if (is_active !== null && is_active !== '') {
      conditions.push(`p.is_active = $${i}`);
      params.push(is_active === 'true');
      i++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM products p ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT
        p.id, p.product_id, p.name, p.barcode, p.sku,
        p.mrp, p.selling_price, p.cost_price, p.unit,
        p.is_active, p.is_service, p.image_url,
        p.created_at, p.updated_at,
        c.name  AS category_name,
        sc.name AS sub_category_name,
        b.name  AS brand_name,
        m.name  AS manufacturer_name,
        d.name  AS department_name,
        ih.name AS income_head_name,
        t.name  AS tax_name,
        t.rate  AS tax_rate
       FROM products p
       LEFT JOIN categories    c  ON p.category_id     = c.id
       LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
       LEFT JOIN brands         b  ON p.brand_id        = b.id
       LEFT JOIN manufacturers  m  ON p.manufacturer_id = m.id
       LEFT JOIN departments    d  ON p.department_id   = d.id
       LEFT JOIN income_heads   ih ON p.income_head_id  = ih.id
       LEFT JOIN taxes          t  ON p.tax_id          = t.id
       ${where}
       ORDER BY p.id DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, pageSize, offset]
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

// ─── POST /api/catalog/products ──────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, sku, mrp, selling_price } = body;

    if (!name?.trim()) {
      return validationError({ name: 'Product name is required' });
    }

    const result = await query(
      `INSERT INTO products (
        product_id, name, description, barcode, sku,
        category_id, sub_category_id, brand_id, manufacturer_id,
        department_id, income_head_id, tax_id,
        mrp, selling_price, cost_price, unit,
        is_active, is_service, image_url
       ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15, COALESCE($16, 'PCS'),
        COALESCE($17, true), COALESCE($18, false), $19
       ) RETURNING *`,
      [
        body.product_id    || null,
        body.name.trim(),
        body.description   || null,
        body.barcode       || null,
        body.sku           || null,
        body.category_id   || null,
        body.sub_category_id || null,
        body.brand_id      || null,
        body.manufacturer_id || null,
        body.department_id || null,
        body.income_head_id || null,
        body.tax_id        || null,
        body.mrp           || 0,
        body.selling_price || 0,
        body.cost_price    || 0,
        body.unit          || 'PCS',
        body.is_active     ?? true,
        body.is_service    ?? false,
        body.image_url     || null,
      ]
    );

    return successResponse(result.rows[0], 'Product created successfully', 201);
  } catch (err) {
    if (err.code === '23505') {
      return errorResponse('Product with this SKU already exists', 409);
    }
    return errorResponse(err.message);
  }
}