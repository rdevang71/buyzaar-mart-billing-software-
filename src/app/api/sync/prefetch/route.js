/**
 * GET /api/sync/prefetch?storeId=N
 *
 * Returns the product catalogue + payment modes for the given store so the
 * browser can cache them in IndexedDB and keep the POS running offline.
 *
 * Called automatically by OfflineSyncContext whenever the user comes online.
 */

import { NextResponse } from 'next/server';
import { query }        from '@/lib/db';
import { ensureSettingsSchema } from '@/lib/settingsSchema';
import { requireAuth, requirePermission, requireStore } from '@/lib/api-protection';

const DEFAULT_PAYMENT_MODES = [
  { id: 1, name: 'Cash', code: 'cash' },
  { id: 2, name: 'UPI', code: 'upi' },
  { id: 3, name: 'Card', code: 'card' },
];

function normalizePaymentMode(row) {
  const config = row.config || {};
  const code = String(config.paymentMode || row.code || row.name || '').trim().toLowerCase();
  if (!code) return null;
  return {
    id: row.id,
    name: row.name || code.charAt(0).toUpperCase() + code.slice(1),
    code,
    provider: config.provider || '',
    settlementAccount: config.settlementAccount || '',
    allowRefund: config.allowRefund !== false,
  };
}

async function loadPaymentModes(storeId) {
  await ensureSettingsSchema();
  const normalizedStoreId = storeId ? Number(storeId) : null;

  const settingsRes = await query(
    `SELECT id, name, code, config, store_id, setting_type
     FROM settings_records
     WHERE is_active = TRUE
       AND (
         (setting_type = 'store-payment-modes' AND (store_id = $1 OR store_id IS NULL))
         OR setting_type = 'chain-payment-settings'
       )
     ORDER BY
       CASE WHEN store_id = $1 THEN 0 WHEN setting_type = 'store-payment-modes' THEN 1 ELSE 2 END,
       name ASC`,
    [normalizedStoreId]
  );

  const byCode = new Map();
  for (const row of settingsRes.rows) {
    const mode = normalizePaymentMode(row);
    if (mode && !byCode.has(mode.code)) byCode.set(mode.code, mode);
  }

  if (byCode.size) return Array.from(byCode.values());

  try {
    const pmResult = await query(
      `SELECT id, name, LOWER(COALESCE(code, name)) AS code
       FROM payment_modes
       WHERE store_id = $1 OR store_id IS NULL
       ORDER BY name`,
      [normalizedStoreId]
    );
    return pmResult.rows.length ? pmResult.rows : DEFAULT_PAYMENT_MODES;
  } catch {
    return DEFAULT_PAYMENT_MODES;
  }
}

export async function GET(request) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  const permissionCheck = requirePermission(auth.user, 'MANAGE_POS', 'VIEW_PRODUCTS', 'MANAGE_PRODUCTS');
  if (permissionCheck.error) return permissionCheck.error;

  const { searchParams } = new URL(request.url);
  const storeId = Number(searchParams.get('storeId') || searchParams.get('store_id') || 0) || null;
  if (!storeId) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
  }
  const storeCheck = requireStore(auth.user, storeId);
  if (storeCheck.error) return storeCheck.error;

  // ── Products (with store-specific pricing when storeId provided) ─────────
  const productsResult = await query(
    `SELECT
       p.id,
       p.name,
       p.barcode,
       p.sku,
       p.is_active,
       p.is_service,
       COALESCE(ps.selling_price, p.selling_price, 0) AS selling_price,
       COALESCE(ps.mrp,           p.mrp,            0) AS mrp,
       COALESCE(ps.is_active, TRUE)                    AS saleability_active
     FROM products p
     INNER JOIN product_saleability ps
       ON ps.product_id = p.id AND ps.store_id = $1
     WHERE p.is_active = TRUE
       AND ps.is_active = TRUE
     ORDER BY p.name
     LIMIT 3000`,
    [storeId]
  );

  // ── Payment modes ────────────────────────────────────────────────────────
  const paymentModes = await loadPaymentModes(storeId);

  return NextResponse.json({
    products:     productsResult.rows,
    paymentModes,
    syncedAt:     new Date().toISOString(),
  });
}
