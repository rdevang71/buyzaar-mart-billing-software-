import { getClient, query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { ensureCatalogExtrasSchema } from '@/lib/catalogExtrasSchema';
import { ensureStockInSchema } from '@/lib/stockInSchema';

async function ensureProductDiscountSchema() {
  await query(`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS allow_discount_on_pos BOOLEAN NOT NULL DEFAULT FALSE;
  `);
}

function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function nullableText(value) {
  const text = normalizeText(value);
  return text || null;
}

function toNumber(value, fallback = 0) {
  if (value === '' || value === null || value === undefined) return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toBoolean(value, fallback = false) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const text = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(text)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(text)) return false;
  return fallback;
}

async function resolveIdByName(client, table, name, { categoryId = null } = {}) {
  const lookup = normalizeText(name);
  if (!lookup) return null;

  if (table === 'sub_categories' && categoryId) {
    const scoped = await client.query(
      `SELECT id FROM sub_categories WHERE category_id = $1 AND name ILIKE $2 LIMIT 1`,
      [categoryId, lookup]
    );
    if (scoped.rows.length) return scoped.rows[0].id;
  }

  const res = await client.query(`SELECT id FROM ${table} WHERE name ILIKE $1 LIMIT 1`, [lookup]);
  return res.rows[0]?.id || null;
}

function parseStoreSaleabilityFromRow(row = {}) {
  const byStore = new Map();
  for (const [key, value] of Object.entries(row)) {
    const match = key.match(/^store_(\d+)_(enabled|selling_price|mrp|low_stock_value)$/);
    if (!match) continue;
    const storeId = Number(match[1]);
    const field = match[2];
    if (!Number.isFinite(storeId)) continue;
    if (!byStore.has(storeId)) byStore.set(storeId, {});
    byStore.get(storeId)[field] = value;
  }
  return [...byStore.entries()].map(([storeId, fields]) => ({
    storeId,
    enabled: toBoolean(fields.enabled, true),
    sellingPrice: toNumber(fields.selling_price, 0),
    mrp: toNumber(fields.mrp, 0),
    lowStockValue: toNumber(fields.low_stock_value, 0),
  }));
}

async function insertProductWithIntegrations(client, row) {
  const name = normalizeText(row.name);
  if (!name) {
    throw new Error('name is required');
  }

  const categoryId = await resolveIdByName(client, 'categories', row.category_name);
  const subCategoryId = await resolveIdByName(client, 'sub_categories', row.sub_category_name, { categoryId });
  const brandId = await resolveIdByName(client, 'brands', row.brand_name);
  const manufacturerId = await resolveIdByName(client, 'manufacturers', row.manufacturer_name);
  const departmentId = await resolveIdByName(client, 'departments', row.department_name);
  const taxId = await resolveIdByName(client, 'taxes', row.tax_name);
  const inventoryStoreId = await resolveIdByName(client, 'stores', row.inventory_store_name);

  const insert = await client.query(
    `INSERT INTO products (
      product_id, name, description, barcode, sku,
      category_id, sub_category_id, brand_id, manufacturer_id,
      department_id, income_head_id, tax_id,
      mrp, selling_price, cost_price, unit,
      is_active, is_service, image_url, allow_discount_on_pos
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12,
      $13, $14, $15, COALESCE($16, 'PCS'),
      COALESCE($17, true), COALESCE($18, false), $19, COALESCE($20, false)
    ) RETURNING *`,
    [
      nullableText(row.product_id),
      name,
      nullableText(row.description),
      nullableText(row.barcode),
      nullableText(row.sku),
      categoryId,
      subCategoryId,
      brandId,
      manufacturerId,
      departmentId,
      null,
      taxId,
      toNumber(row.mrp, 0),
      toNumber(row.selling_price, 0),
      toNumber(row.cost_price, 0),
      normalizeText(row.unit) || 'PCS',
      toBoolean(row.is_active, true),
      toBoolean(row.is_service, false),
      nullableText(row.image_url),
      toBoolean(row.allow_discount_on_pos, false),
    ]
  );

  const createdProduct = insert.rows[0];
  const openingStockQty = toNumber(row.opening_stock_qty, 0);
  const manageInventoryEnabled = toBoolean(row.manage_inventory_enabled, true);

  if (manageInventoryEnabled && openingStockQty > 0) {
    const stockInInsert = await client.query(
      `INSERT INTO stock_in (
        method,
        destination_id,
        apply_taxes,
        add_products_prefill,
        status,
        vendor_name,
        invoice_date,
        invoice_number,
        other_charges,
        remarks,
        total_items,
        total_cost,
        total_tax,
        reference_type,
        reference_id,
        meta,
        created_at,
        confirmed_at
      ) VALUES (
        'new',
        $1,
        true,
        false,
        'confirmed',
        'Opening Stock',
        CURRENT_DATE,
        $2,
        0,
        'Opening stock from product import',
        $3,
        $4,
        0,
        'product',
        $5,
        $6,
        NOW(),
        NOW()
      ) RETURNING id`,
      [
        inventoryStoreId,
        `OPEN-${createdProduct.id}`,
        openingStockQty,
        openingStockQty * toNumber(row.cost_price, 0),
        String(createdProduct.id),
        JSON.stringify({
          source: 'product-import',
          disable_billing_on_zero: toBoolean(row.disable_billing_on_zero, true),
          disable_sales_on_expiry: toBoolean(row.disable_sales_on_expiry, false),
          inventory_method: normalizeText(row.inventory_method) || 'direct',
          stock_item_type: normalizeText(row.stock_item_type) || 'unbatched',
          default_low_stock_value: toNumber(row.default_low_stock_value, 0),
          dimensions: {
            unit: normalizeText(row.dimension_unit) || 'metre',
            length: toNumber(row.length, 0),
            width: toNumber(row.width, 0),
            height: toNumber(row.height, 0),
          },
          weight: {
            unit: normalizeText(row.weight_unit) || 'kilogram',
            value: toNumber(row.weight_value, 0),
          },
          flags: {
            is_sellable_on_pos: toBoolean(row.is_sellable_on_pos, true),
            allow_variable_pricing: toBoolean(row.allow_variable_pricing, false),
            include_tax: toBoolean(row.include_tax, false),
            charge_name: nullableText(row.charge_name),
            selected_color: nullableText(row.selected_color),
          },
        }),
      ]
    );

    const stockInId = stockInInsert.rows[0].id;
    await client.query('UPDATE stock_in SET transaction_id = $1 WHERE id = $2', [`STK-${String(stockInId).padStart(4, '0')}`, stockInId]);
    await client.query(
      `INSERT INTO stock_in_items (stock_in_id, product_id, product_name, qty, cost_price, tax_value, created_at)
       VALUES ($1, $2, $3, $4, $5, 0, NOW())`,
      [stockInId, createdProduct.id, createdProduct.name, openingStockQty, toNumber(row.cost_price, 0)]
    );
  }

  const saleabilityRows = parseStoreSaleabilityFromRow(row);
  for (const saleability of saleabilityRows) {
    if (!saleability.enabled) continue;
    await client.query(
      `INSERT INTO product_saleability (product_id, store_id, is_active, selling_price, mrp, low_stock_value)
       VALUES ($1, $2, true, $3, $4, $5)
       ON CONFLICT (product_id, store_id) DO UPDATE SET
         is_active = EXCLUDED.is_active,
         selling_price = EXCLUDED.selling_price,
         mrp = EXCLUDED.mrp,
         low_stock_value = EXCLUDED.low_stock_value,
         updated_at = NOW()`,
      [
        createdProduct.id,
        saleability.storeId,
        saleability.sellingPrice,
        saleability.mrp,
        saleability.lowStockValue,
      ]
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, rows } = body; // type: 'categories' | 'sub-categories' | 'products'

    if (!rows?.length) return errorResponse('No data to import');

    if (type === 'products') {
      await Promise.all([ensureStockInSchema(), ensureCatalogExtrasSchema(), ensureProductDiscountSchema()]);
    }
    // Ensure catalog extras schema exists for product-groups as well
    if (type === 'product-groups') {
      await ensureCatalogExtrasSchema();
    }

    let inserted = 0;
    let skipped  = 0;
    const errors = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      try {
        if (type === 'categories') {
          if (!row.name?.trim()) { skipped++; continue; }
          await query(
            `INSERT INTO categories (name, description, sort_sequence, is_active)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT DO NOTHING`,
            [row.name.trim(), row.description || null, row.sort_sequence ?? 0, row.is_active ?? true]
          );
          inserted++;
        } else if (type === 'sub-categories') {
          if (!row.name?.trim()) { skipped++; continue; }
          // Find category by name if provided
          let category_id = null;
          if (row.category_name) {
            const cat = await query(
              `SELECT id FROM categories WHERE name ILIKE $1 LIMIT 1`,
              [row.category_name.trim()]
            );
            if (cat.rows.length) category_id = cat.rows[0].id;
          }
          await query(
            `INSERT INTO sub_categories (name, description, category_id, sort_sequence, is_active)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT DO NOTHING`,
            [row.name.trim(), row.description || null, category_id, row.sort_sequence ?? 0, row.is_active ?? true]
          );
          inserted++;
        } else if (type === 'products') {
          const client = await getClient();
          try {
            await client.query('BEGIN');
            await insertProductWithIntegrations(client, row);
            await client.query('COMMIT');
            inserted++;
          } catch (err) {
            await client.query('ROLLBACK');
            throw err;
          } finally {
            client.release();
          }
        } else if (type === 'product-groups') {
          if (!row.name?.trim()) { skipped++; continue; }
          // Resolve category by name if provided
          let category_id = null;
          if (row.category_name) {
            const cat = await query(
              `SELECT id FROM categories WHERE name ILIKE $1 LIMIT 1`,
              [row.category_name.trim()]
            );
            if (cat.rows.length) category_id = cat.rows[0].id;
          }
          await query(
            `INSERT INTO product_groups (name, description, category_id, is_active)
             VALUES ($1, $2, $3, COALESCE($4, true))
             ON CONFLICT DO NOTHING`,
            [row.name.trim(), row.description || null, category_id, row.is_active ?? true]
          );
          inserted++;
        } else {
          throw new Error(`Unsupported import type: ${type}`);
        }
      } catch (err) {
        errors.push({
          row: row.name || `Row ${index + 2}`,
          error: err.code === '23505' ? 'Duplicate product (likely SKU/barcode conflict)' : err.message,
        });
        skipped++;
      }
    }

    return successResponse({ inserted, skipped, errors }, `${inserted} records imported successfully`);
  } catch (err) {
    return errorResponse(err.message);
  }
}
