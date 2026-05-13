import { query } from '@/lib/db';
import { successResponse, errorResponse, notFound, validationError } from '@/lib/apiResponse';

const SELECT_PRODUCT = `
  SELECT
    p.id, p.product_id, p.name, p.description, p.barcode, p.sku,
    p.mrp, p.selling_price, p.cost_price, p.unit,
    p.is_active, p.is_service, p.image_url,
    p.category_id, p.sub_category_id, p.brand_id,
    p.manufacturer_id, p.department_id, p.income_head_id, p.tax_id,
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
  LEFT JOIN categories     c  ON p.category_id     = c.id
  LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
  LEFT JOIN brands         b  ON p.brand_id        = b.id
  LEFT JOIN manufacturers  m  ON p.manufacturer_id = m.id
  LEFT JOIN departments    d  ON p.department_id   = d.id
  LEFT JOIN income_heads   ih ON p.income_head_id  = ih.id
  LEFT JOIN taxes          t  ON p.tax_id          = t.id
`;

// ─── GET /api/catalog/products/[id] ──────────────────────────
export async function GET(request, { params }) {
  try {
    const result = await query(
      `${SELECT_PRODUCT} WHERE p.id = $1`,
      [params.id]
    );
    if (!result.rows.length) return notFound('Product not found');
    return successResponse(result.rows[0]);
  } catch (err) {
    return errorResponse(err.message);
  }
}

// ─── PUT /api/catalog/products/[id] ──────────────────────────
export async function PUT(request, { params }) {
  try {
    const body = await request.json();

    if (!body.name?.trim()) {
      return validationError({ name: 'Product name is required' });
    }

    const result = await query(
      `UPDATE products SET
        product_id      = $1,
        name            = $2,
        description     = $3,
        barcode         = $4,
        sku             = $5,
        category_id     = $6,
        sub_category_id = $7,
        brand_id        = $8,
        manufacturer_id = $9,
        department_id   = $10,
        income_head_id  = $11,
        tax_id          = $12,
        mrp             = $13,
        selling_price   = $14,
        cost_price      = $15,
        unit            = $16,
        is_active       = $17,
        is_service      = $18,
        image_url       = $19,
        updated_at      = NOW()
       WHERE id = $20
       RETURNING *`,
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
        params.id,
      ]
    );

    if (!result.rows.length) return notFound('Product not found');
    return successResponse(result.rows[0], 'Product updated successfully');
  } catch (err) {
    if (err.code === '23505') {
      return errorResponse('Product with this SKU already exists', 409);
    }
    return errorResponse(err.message);
  }
}

// ─── DELETE /api/catalog/products/[id] ───────────────────────
export async function DELETE(request, { params }) {
  try {
    const result = await query(
      `DELETE FROM products WHERE id = $1 RETURNING id`,
      [params.id]
    );
    if (!result.rows.length) return notFound('Product not found');
    return successResponse({ id: params.id }, 'Product deleted successfully');
  } catch (err) {
    return errorResponse(err.message);
  }
}