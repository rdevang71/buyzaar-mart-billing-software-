import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';

async function safeQuery(sql) {
  try {
    return await query(sql);
  } catch {
    return { rows: [{ count: 0 }] };
  }
}

export async function GET() {
  try {
    const [
      totalProductsRes,
      totalCategoriesRes,
      totalBrandsRes,
      noImageRes,
      outOfStockRes,
      hsnMissingRes,
      missingPriceRes,
      duplicateSkuRes,
      belowCostRes,
      productsRes,
    ] = await Promise.all([
      safeQuery(`SELECT COUNT(*)::int AS count FROM products`),
      safeQuery(`SELECT COUNT(*)::int AS count FROM categories`),
      safeQuery(`SELECT COUNT(*)::int AS count FROM brands`),
      safeQuery(`SELECT COUNT(*)::int AS count FROM products WHERE image_url IS NULL OR image_url = ''`),
      safeQuery(`SELECT COUNT(*)::int AS count FROM products p
                 LEFT JOIN (
                   SELECT product_id, SUM(qty) AS total
                   FROM stock_in_items
                   GROUP BY product_id
                 ) s ON p.id = s.product_id
                 WHERE COALESCE(s.total, 0) = 0`),
      safeQuery(`SELECT COUNT(*)::int AS count FROM products p
                 LEFT JOIN taxes t ON p.tax_id = t.id
                 WHERE t.hsn_code IS NULL OR t.hsn_code = ''`),
      safeQuery(`SELECT COUNT(*)::int AS count FROM products WHERE COALESCE(mrp, 0) <= 0`),
      safeQuery(`SELECT COUNT(*)::int AS count
                 FROM products p
                 JOIN (
                   SELECT sku
                   FROM products
                   WHERE sku IS NOT NULL AND TRIM(sku) <> ''
                   GROUP BY sku
                   HAVING COUNT(*) > 1
                 ) d ON d.sku = p.sku`),
      safeQuery(`SELECT COUNT(*)::int AS count FROM products
                 WHERE COALESCE(cost_price, 0) > 0
                   AND COALESCE(mrp, 0) > 0
                   AND mrp < cost_price`),
      safeQuery(`SELECT
                  p.id, p.name, p.sku, p.barcode, p.image_url,
                  p.mrp AS price, p.cost_price AS cost,
                  CASE WHEN p.cost_price > 0 AND p.mrp > 0
                    THEN ROUND(((p.mrp - p.cost_price) / p.cost_price * 100)::numeric, 0)
                    ELSE 0 END AS margin,
                  b.name AS brand,
                  c.name AS category,
                  COALESCE(t.hsn_code, '') AS hsn_code,
                  COALESCE(si.total_stock, 0) AS stock,
                  CASE WHEN p.image_url IS NULL OR p.image_url = '' THEN true ELSE false END AS no_image,
                  CASE WHEN t.hsn_code IS NULL OR t.hsn_code = '' THEN true ELSE false END AS hsn_missing,
                  CASE WHEN COALESCE(p.mrp, 0) <= 0 THEN true ELSE false END AS missing_price,
                  CASE WHEN COALESCE(p.cost_price, 0) > 0 AND COALESCE(p.mrp, 0) > 0 AND p.mrp < p.cost_price THEN true ELSE false END AS below_cost,
                  CASE WHEN d.cnt > 1 THEN true ELSE false END AS duplicate_sku
                 FROM products p
                 LEFT JOIN brands b ON p.brand_id = b.id
                 LEFT JOIN categories c ON p.category_id = c.id
                 LEFT JOIN taxes t ON p.tax_id = t.id
                 LEFT JOIN (
                   SELECT product_id, SUM(qty) AS total_stock
                   FROM stock_in_items
                   GROUP BY product_id
                 ) si ON p.id = si.product_id
                 LEFT JOIN (
                   SELECT sku, COUNT(*) AS cnt
                   FROM products
                   WHERE sku IS NOT NULL AND TRIM(sku) <> ''
                   GROUP BY sku
                 ) d ON d.sku = p.sku
                 ORDER BY p.id DESC
                 LIMIT 100`),
    ]);

    const total_products = totalProductsRes.rows[0]?.count || 0;
    const total_categories = totalCategoriesRes.rows[0]?.count || 0;
    const total_brands = totalBrandsRes.rows[0]?.count || 0;
    const no_image = noImageRes.rows[0]?.count || 0;
    const out_of_stock = outOfStockRes.rows[0]?.count || 0;
    const hsn_missing = hsnMissingRes.rows[0]?.count || 0;
    const missing_price = missingPriceRes.rows[0]?.count || 0;
    const duplicate_skus = duplicateSkuRes.rows[0]?.count || 0;
    const below_cost = belowCostRes.rows[0]?.count || 0;

    const needs_attention = [
      no_image,
      out_of_stock,
      hsn_missing,
      missing_price,
      duplicate_skus,
      below_cost,
    ].reduce((sum, value) => sum + Number(value || 0), 0);

    const health_score = Math.max(0, Math.round(
      100 - (no_image * 2) - (hsn_missing * 5) - (out_of_stock * 1) - (missing_price * 4) - (duplicate_skus * 3) - (below_cost * 4)
    ));

    return successResponse({
      stats: {
        total_products,
        total_categories,
        total_brands,
        no_image,
        out_of_stock,
        hsn_missing,
        missing_price,
        duplicate_skus,
        below_cost,
        needs_attention,
        health_score: Math.min(100, health_score),
      },
      products: productsRes.rows || [],
    });
  } catch (err) {
    return errorResponse(err.message);
  }
}
