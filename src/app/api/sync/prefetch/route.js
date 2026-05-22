/**
 * GET /api/sync/prefetch?storeId=N
 *
 * Returns the product catalogue + payment modes for the given store so the
 * browser can cache them in IndexedDB and keep the POS running offline.
 *
 * Called automatically by OfflineSyncContext whenever the user comes online.
 */

import { NextResponse } from 'next/server';
import { cookies }      from 'next/headers';
import { verifyToken }  from '@/lib/auth-enhanced';
import { query }        from '@/lib/db';

export async function GET(request) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ||
                cookieStore.get('auth_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload?.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('storeId') || null;

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
     LEFT JOIN product_saleability ps
       ON ps.product_id = p.id AND ps.store_id = $1
     WHERE p.is_active = TRUE
     ORDER BY p.name
     LIMIT 3000`,
    [storeId]
  );

  // ── Payment modes ────────────────────────────────────────────────────────
  let paymentModes = [];
  try {
    // Try the payment_modes table (may not exist in every setup)
    const pmResult = await query(
      `SELECT id, name
       FROM payment_modes
       WHERE store_id = $1 OR store_id IS NULL
       ORDER BY name`,
      [storeId]
    );
    paymentModes = pmResult.rows;
  } catch {
    // Fallback to sensible defaults if table doesn't exist yet
    paymentModes = [
      { id: 1, name: 'Cash' },
      { id: 2, name: 'UPI'  },
      { id: 3, name: 'Card' },
    ];
  }

  return NextResponse.json({
    products:     productsResult.rows,
    paymentModes,
    syncedAt:     new Date().toISOString(),
  });
}
