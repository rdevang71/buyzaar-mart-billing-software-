import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { ensureCatalogExtrasSchema } from '@/lib/catalogExtrasSchema';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getAvailableStockSql() {
  return `
    COALESCE(stock_in_totals.qty, 0)
    + COALESCE(transfer_in_totals.qty, 0)
    - COALESCE(sales_totals.qty, 0)
    - COALESCE(stock_out_totals.qty, 0)
    - COALESCE(transfer_out_totals.qty, 0)
  `.trim();
}

export async function GET(request) {
  try {
    await ensureCatalogExtrasSchema();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const storeId = Number(searchParams.get('store_id') || 0) || null;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const offset = (page - 1) * pageSize;

    if (!storeId) {
      return successResponse({ records: [], total: 0, page, pageSize, totalPages: 0 });
    }

    const params = [storeId];
    const filters = [
      `TRUE`,
    ];

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      filters.push(`(
        COALESCE(p.name, movement_products.product_name, '') ILIKE $${params.length}
        OR COALESCE(p.sku, '') ILIKE $${params.length}
        OR COALESCE(p.barcode, '') ILIKE $${params.length}
      )`);
    }

    const where = filters.length ? `AND ${filters.join(' AND ')}` : '';

    const inventoryQuery = `
      WITH stock_in_totals AS (
        SELECT sii.product_id, SUM(sii.qty) AS qty
        FROM stock_in_items sii
        INNER JOIN stock_in si ON si.id = sii.stock_in_id
        WHERE si.status = 'confirmed' AND si.destination_id = $1
        GROUP BY sii.product_id
      ), transfer_in_totals AS (
        SELECT sti.product_id, SUM(sti.qty) AS qty
        FROM stock_transfer_items sti
        INNER JOIN stock_transfer st ON st.id = sti.stock_transfer_id
        WHERE st.status = 'confirmed' AND st.destination_id = $1
        GROUP BY sti.product_id
      ), sales_totals AS (
        SELECT sbi.product_id, SUM(sbi.qty) AS qty
        FROM sales_bill_items sbi
        INNER JOIN sales_bills sb ON sb.id = sbi.sales_bill_id
        WHERE sb.status IN ('paid', 'completed') AND sb.store_id = $1
        GROUP BY sbi.product_id
      ), stock_out_totals AS (
        SELECT soi.product_id, SUM(soi.qty) AS qty
        FROM stock_out_items soi
        INNER JOIN stock_out so ON so.id = soi.stock_out_id
        WHERE so.status = 'confirmed'
          AND so.destination_id = $1
          AND COALESCE(so.reference_type, '') <> 'sales_bill'
        GROUP BY soi.product_id
      ), transfer_out_totals AS (
        SELECT sti.product_id, SUM(sti.qty) AS qty
        FROM stock_transfer_items sti
        INNER JOIN stock_transfer st ON st.id = sti.stock_transfer_id
        WHERE st.status = 'confirmed' AND st.source_id = $1
        GROUP BY sti.product_id
      ), movement_products AS (
        SELECT product_id, MAX(product_name) AS product_name
        FROM (
          SELECT sii.product_id, sii.product_name
          FROM stock_in_items sii
          INNER JOIN stock_in si ON si.id = sii.stock_in_id
          WHERE si.status = 'confirmed' AND si.destination_id = $1

          UNION ALL

          SELECT sti.product_id, sti.product_name
          FROM stock_transfer_items sti
          INNER JOIN stock_transfer st ON st.id = sti.stock_transfer_id
          WHERE st.status = 'confirmed' AND st.destination_id = $1

          UNION ALL

          SELECT sbi.product_id, sbi.product_name
          FROM sales_bill_items sbi
          INNER JOIN sales_bills sb ON sb.id = sbi.sales_bill_id
          WHERE sb.status IN ('paid', 'completed') AND sb.store_id = $1

          UNION ALL

          SELECT soi.product_id, soi.product_name
          FROM stock_out_items soi
          INNER JOIN stock_out so ON so.id = soi.stock_out_id
          WHERE so.status = 'confirmed'
            AND so.destination_id = $1
            AND COALESCE(so.reference_type, '') <> 'sales_bill'

          UNION ALL

          SELECT sti.product_id, sti.product_name
          FROM stock_transfer_items sti
          INNER JOIN stock_transfer st ON st.id = sti.stock_transfer_id
          WHERE st.status = 'confirmed' AND st.source_id = $1
        ) movement_rows
        GROUP BY product_id
      ), inventory_products AS (
        SELECT product_id FROM stock_in_totals
        UNION
        SELECT product_id FROM transfer_in_totals
        UNION
        SELECT product_id FROM sales_totals
        UNION
        SELECT product_id FROM stock_out_totals
        UNION
        SELECT product_id FROM transfer_out_totals
      )
      SELECT
        COALESCE(p.id, mp.product_id) AS id,
        COALESCE(p.product_id::text, mp.product_id::text) AS product_id,
        COALESCE(p.name, mp.product_name, '') AS name,
        COALESCE(p.sku, '') AS sku,
        COALESCE(p.barcode, '') AS barcode,
        COALESCE(p.mrp, 0) AS mrp,
        COALESCE(p.selling_price, 0) AS selling_price,
        COALESCE(p.cost_price, 0) AS cost_price,
        c.name AS "categoryName",
        b.name AS "brandName",
        ${getAvailableStockSql()} AS "availableStock",
        COALESCE(t.rate, 0) AS "taxRate"
      FROM movement_products mp
      LEFT JOIN products p ON p.id = mp.product_id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN taxes t ON p.tax_id = t.id
      LEFT JOIN stock_in_totals ON stock_in_totals.product_id = p.id
      LEFT JOIN transfer_in_totals ON transfer_in_totals.product_id = p.id
      LEFT JOIN sales_totals ON sales_totals.product_id = p.id
      LEFT JOIN stock_out_totals ON stock_out_totals.product_id = p.id
      LEFT JOIN transfer_out_totals ON transfer_out_totals.product_id = p.id
      WHERE COALESCE(stock_in_totals.qty, 0)
        + COALESCE(transfer_in_totals.qty, 0)
        - COALESCE(sales_totals.qty, 0)
        - COALESCE(stock_out_totals.qty, 0)
        - COALESCE(transfer_out_totals.qty, 0) > 0
      ${where}
    `;

    const count = await query(
      `SELECT COUNT(*)::int AS count FROM (${inventoryQuery}) inventory`,
      params
    );

    params.push(pageSize, offset);

    const result = await query(
      `SELECT * FROM (${inventoryQuery}) inventory
       ORDER BY name ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return successResponse({
      records: result.rows.map((row) => ({
        ...row,
        availableStock: toNumber(row.availableStock),
      })),
      total: count.rows[0]?.count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count.rows[0]?.count || 0) / pageSize),
    });
  } catch (err) {
    return errorResponse(err.message);
  }
}