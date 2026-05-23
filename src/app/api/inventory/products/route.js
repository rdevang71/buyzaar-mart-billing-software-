import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { ensureCatalogExtrasSchema } from '@/lib/catalogExtrasSchema';
import { ensureStoresSchema } from '@/lib/storesSchema';
import { ensureInventoryBatchSchema } from '@/lib/inventoryBatching';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(request) {
  try {
    await ensureCatalogExtrasSchema();
    await ensureStoresSchema();
    await ensureInventoryBatchSchema();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const storeId = Number(searchParams.get('store_id') || 0) || null;
    const warehouseStock = searchParams.get('warehouse_stock') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const offset = (page - 1) * pageSize;

    if (warehouseStock) {
      const params = [];
      const filters = [`TRUE`];

      if (search.trim()) {
        params.push(`%${search.trim()}%`);
        filters.push(`(
          COALESCE(p.name, '') ILIKE $${params.length}
          OR COALESCE(p.sku, '') ILIKE $${params.length}
          OR COALESCE(p.barcode, '') ILIKE $${params.length}
        )`);
      }

      const where = filters.length ? `AND ${filters.join(' AND ')}` : '';

      const warehouseInventoryQuery = `
        WITH warehouse_locations AS (
          SELECT id
          FROM stores
          WHERE LOWER(COALESCE(meta->>'locationType', 'Warehouse')) = 'warehouse'
        ), movement_products AS (
          SELECT ib.product_id, SUM(ib.available_qty) AS available_qty
          FROM inventory_batches ib
          INNER JOIN warehouse_locations wl ON wl.id = ib.store_id
          WHERE ib.status = 'active'
            AND ib.available_qty > 0
            AND (ib.expiry_date IS NULL OR ib.expiry_date >= CURRENT_DATE)
          GROUP BY ib.product_id
        )
        SELECT
          COALESCE(p.id, mp.product_id) AS id,
          COALESCE(p.product_id::text, mp.product_id::text) AS product_id,
          COALESCE(p.name, '') AS name,
          COALESCE(p.sku, '') AS sku,
          COALESCE(p.barcode, '') AS barcode,
          COALESCE(p.mrp, 0) AS mrp,
          COALESCE(p.selling_price, 0) AS selling_price,
          COALESCE(p.cost_price, 0) AS cost_price,
          c.name AS "categoryName",
          b.name AS "brandName",
          COALESCE(mp.available_qty, 0) AS "availableStock",
          COALESCE(t.rate, 0) AS "taxRate"
        FROM movement_products mp
        LEFT JOIN products p ON p.id = mp.product_id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN taxes t ON p.tax_id = t.id
        WHERE COALESCE(mp.available_qty, 0) > 0
        ${where}
      `;

      const count = await query(
        `SELECT COUNT(*)::int AS count FROM (${warehouseInventoryQuery}) inventory`,
        params
      );

      params.push(pageSize, offset);

      const result = await query(
        `SELECT * FROM (${warehouseInventoryQuery}) inventory
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
    }

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
        COALESCE(p.name, '') ILIKE $${params.length}
        OR COALESCE(p.sku, '') ILIKE $${params.length}
        OR COALESCE(p.barcode, '') ILIKE $${params.length}
      )`);
    }

    const where = filters.length ? `AND ${filters.join(' AND ')}` : '';

    const inventoryQuery = `
      WITH movement_products AS (
        SELECT ib.product_id, SUM(ib.available_qty) AS available_qty
        FROM inventory_batches ib
        WHERE ib.store_id = $1
          AND ib.status = 'active'
          AND ib.available_qty > 0
          AND (ib.expiry_date IS NULL OR ib.expiry_date >= CURRENT_DATE)
        GROUP BY ib.product_id
      )
      SELECT
        COALESCE(p.id, mp.product_id) AS id,
        COALESCE(p.product_id::text, mp.product_id::text) AS product_id,
        COALESCE(p.name, '') AS name,
        COALESCE(p.sku, '') AS sku,
        COALESCE(p.barcode, '') AS barcode,
        COALESCE(p.mrp, 0) AS mrp,
        COALESCE(p.selling_price, 0) AS selling_price,
        COALESCE(p.cost_price, 0) AS cost_price,
        c.name AS "categoryName",
        b.name AS "brandName",
        COALESCE(mp.available_qty, 0) AS "availableStock",
        COALESCE(t.rate, 0) AS "taxRate"
      FROM movement_products mp
      LEFT JOIN products p ON p.id = mp.product_id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN taxes t ON p.tax_id = t.id
      WHERE COALESCE(mp.available_qty, 0) > 0
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
