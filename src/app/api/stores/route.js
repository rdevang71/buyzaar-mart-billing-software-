import { successResponse, errorResponse, validationError } from '@/lib/api-response';
import { query } from '@/lib/db';
import { ensureStoresSchema } from '@/lib/storesSchema';

function buildStoreMeta(body = {}) {
  return {
    importAddress: body.importAddress || '',
    locationType: body.locationType || 'Store',
    latitude: body.latitude || '',
    longitude: body.longitude || '',
    panNumber: body.panNumber || '',
    storeCapacity: body.storeCapacity || '',
    defaultCustomerGroup: body.defaultCustomerGroup || '',
    storeGuid: body.storeGuid || '',
    shortCode: body.shortCode || '',
    storeArea: body.storeArea || '',
    enableVoucherValidation: !!body.enableVoucherValidation,
    automaticPrint: !!body.automaticPrint,
    enableStoreStockAlert: !!body.enableStoreStockAlert,
    enableStoreOnlineBillingOnly: !!body.enableStoreOnlineBillingOnly,
    cin: body.cin || '',
    tin: body.tin || '',
    serviceTaxNumber: body.serviceTaxNumber || '',
    gstNumber: body.gstNumber || '',
    customerGstOrderPrefix: body.customerGstOrderPrefix || '',
    fssaiLicenseNumber: body.fssaiLicenseNumber || '',
    taxInformation: body.taxInformation || '',
    customStoreOrderPrefix: body.customStoreOrderPrefix || '',
    refundCustomStoreOrderPrefix: body.refundCustomStoreOrderPrefix || '',
    ncCustomStoreOrderPrefix: body.ncCustomStoreOrderPrefix || '',
    ncRefundCustomStoreOrderPrefix: body.ncRefundCustomStoreOrderPrefix || '',
    rwiCustomStoreOrderPrefix: body.rwiCustomStoreOrderPrefix || '',
    users: body.users || '',
  };
}

export async function GET(request) {
  try {
    await ensureStoresSchema();

    const url = new URL(request.url);
    const pageParam = url.searchParams.get('page');
    const pageSizeParam = url.searchParams.get('pageSize');
    const searchParam = (url.searchParams.get('search') || '').trim();

    // If pagination/search params present, return paginated shape expected by stores list page
    if (pageParam || pageSizeParam || searchParam) {
      const page = Math.max(1, Number(pageParam) || 1);
      const pageSize = Math.max(1, Number(pageSizeParam) || 10);

      const where = [];
      const params = [];
      if (searchParam) {
        params.push(`%${searchParam}%`);
        where.push(`(s.name ILIKE $${params.length} OR CAST(s.id AS TEXT) = $${params.length})`);
      }

      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const totalRes = await query(`SELECT COUNT(*)::INT AS total FROM stores s ${whereSql}`, params);
      const total = Number(totalRes.rows[0]?.total || 0);

      const offset = (page - 1) * pageSize;
      const qParams = params.slice();
      qParams.push(pageSize, offset);

      const res = await query(
        `SELECT s.id, s.name, s.address_line1, s.address_line2, s.city, s.state, s.pincode, s.country,
                s.manager_name, s.manager_mobile, s.manager_email, s.opening_time, s.closing_time,
                s.is_active, s.meta, s.created_at, s.updated_at
         FROM stores s
         ${whereSql}
         ORDER BY s.name ASC
         LIMIT $${qParams.length - 1} OFFSET $${qParams.length}`,
        qParams
      );

      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      return successResponse({ stores: res.rows, page, pageSize, total, totalPages }, 'Stores fetched');
    }

    // Fallback: return all stores as an array for legacy callers
    const res = await query(
      `SELECT id, name, address_line1, address_line2, city, state, pincode, country,
              manager_name, manager_mobile, manager_email, opening_time, closing_time, is_active, meta, created_at, updated_at
       FROM stores
       ORDER BY name`
    );
    return successResponse({ stores: res.rows }, 'Stores fetched');
  } catch (err) {
    console.error(err);
    return errorResponse('Failed to fetch stores');
  }
}

export async function POST(request) {
  try {
    await ensureStoresSchema();

    const body = await request.json().catch(() => ({}));
    const name = String(body.name || '').trim();
    if (!name) {
      return validationError([{ field: 'name', message: 'Store name is required' }]);
    }

    const meta = buildStoreMeta(body);

    const insert = await query(
      `INSERT INTO stores (
         name, address_line1, address_line2, city, state, pincode, country,
         manager_name, manager_mobile, manager_email, opening_time, closing_time, meta, is_active, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,TRUE,NOW(),NOW())
       RETURNING id, name, address_line1, address_line2, city, state, pincode, country,
                 manager_name, manager_mobile, manager_email, opening_time, closing_time, is_active, meta, created_at, updated_at`,
      [
        name,
        body.addressLine1 || null,
        body.addressLine2 || null,
        body.city || null,
        body.state || null,
        body.pincode || null,
        body.country || 'India',
        body.managerName || null,
        body.managerMobile || null,
        body.managerEmail || null,
        body.openingTime || null,
        body.closingTime || null,
        JSON.stringify(meta),
      ]
    );

    if (!insert.rows.length) {
      return errorResponse('Failed to create store');
    }

    return successResponse({ store: insert.rows[0] }, 'Store created', 201);
  } catch (err) {
    console.error('[stores POST]', err);
    return errorResponse('Failed to create store');
  }
}
