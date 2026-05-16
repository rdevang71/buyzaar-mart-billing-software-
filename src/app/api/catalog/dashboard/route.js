import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function GET() {
  try {
    const [
      productsResult,
      categoriesResult,
      brandsResult,
      noImageResult,
      outOfStockResult,
      hsnMissingResult,
      needsAttentionResult,
    ] = await Promise.all([
      query(`SELECT COUNT(*) FROM products`),
      query(`SELECT COUNT(*) FROM categories WHERE is_active = true`),
      query(`SELECT COUNT(DISTINCT brand_id) FROM products WHERE brand_id IS NOT NULL`),
      query(`SELECT COUNT(*) FROM products WHERE image_url IS NULL OR image_url = ''`),
      query(`SELECT COUNT(*) FROM products p
             LEFT JOIN (
               SELECT product_id, SUM(qty) as total
               FROM stock_in_items GROUP BY product_id
             ) s ON p.id = s.product_id
             WHERE COALESCE(s.total, 0) = 0`),
      query(`SELECT COUNT(*) FROM products p
             LEFT JOIN taxes t ON p.tax_id = t.id
             WHERE t.hsn_code IS NULL OR t.hsn_code = ''`),
      query(`SELECT COUNT(*) FROM products WHERE
             image_url IS NULL OR image_url = '' OR
             tax_id IS NULL OR tax_id = 0`),
    ]);

    // Fetch product list with joins
    const productsListResult = await query(`
      SELECT
        p.id, p.name, p.image_url,
        p.mrp AS price, p.cost_price AS cost,
        CASE WHEN p.cost_price > 0
          THEN ROUND(((p.mrp - p.cost_price) / p.cost_price * 100)::numeric, 0)
          ELSE 0 END AS margin,
        b.name AS brand,
        c.name AS category,
        COALESCE(t.hsn_code, '') AS hsn_code,
        COALESCE(si.total_stock, 0) AS stock,
        CASE WHEN p.image_url IS NULL OR p.image_url = '' THEN true ELSE false END AS no_image,
        CASE WHEN t.hsn_code IS NULL OR t.hsn_code = '' THEN true ELSE false END AS hsn_missing
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN taxes t ON p.tax_id = t.id
      LEFT JOIN (
        SELECT product_id, SUM(qty) AS total_stock
        FROM stock_in_items GROUP BY product_id
      ) si ON p.id = si.product_id
      ORDER BY p.id DESC
      LIMIT 100
    `);

    const total_products   = parseInt(productsResult.rows[0].count);
    const total_categories = parseInt(categoriesResult.rows[0].count);
    const total_brands     = parseInt(brandsResult.rows[0].count);
    const no_image         = parseInt(noImageResult.rows[0].count);
    const out_of_stock     = parseInt(outOfStockResult.rows[0].count);
    const hsn_missing      = parseInt(hsnMissingResult.rows[0].count);
    const needs_attention  = parseInt(needsAttentionResult.rows[0].count);

    // Simple health score
    const health_score = Math.max(0, Math.round(
      100 - (no_image * 2) - (hsn_missing * 5) - (out_of_stock * 1)
    ));

    return successResponse({
      stats: {
        total_products,
        total_categories,
        total_brands,
        no_image,
        out_of_stock,
        hsn_missing,
        needs_attention,
        health_score: Math.min(100, health_score),
      },
      products: productsListResult.rows,
    });
  } catch (err) {
    return errorResponse(err.message);
  }
}