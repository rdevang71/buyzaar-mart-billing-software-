import { successResponse, errorResponse, validationError } from '@/lib/apiResponse';
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
    const searchParams = new URL(request.url).searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10));
    const search = (searchParams.get('search') || '').trim();
    const offset = (page - 1) * pageSize;

    const where = [];
    const params = [];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      where.push(`(
        LOWER(name) LIKE $${params.length} OR
        LOWER(COALESCE(city, '')) LIKE $${params.length} OR
        LOWER(COALESCE(state, '')) LIKE $${params.length} OR
        LOWER(COALESCE(manager_name, '')) LIKE $${params.length} OR
        CAST(id AS TEXT) LIKE $${params.length}
      )`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*)::int AS count FROM stores ${whereClause}`,
      params
    );

    params.push(pageSize, offset);
    const res = await query(
      `SELECT id, name, city, state, pincode, country, manager_name, manager_mobile, manager_email, opening_time, closing_time, is_active, meta, created_at
       FROM stores
       ${whereClause}
       ORDER BY id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const total = countRes.rows[0]?.count || 0;

    return successResponse({
      stores: res.rows,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (err) {
    return errorResponse(err.message || 'Unable to fetch stores');
  }
}

export async function POST(request) {
  try {
    await ensureStoresSchema();
    const body = await request.json();
    const name = (body.name || '').trim();

    if (!name) {
      return validationError({ name: 'Store name is required' });
    }

    const meta = buildStoreMeta(body);

    const insert = await query(
      `INSERT INTO stores (
        name,
        address_line1,
        address_line2,
        city,
        state,
        pincode,
        country,
        manager_name,
        manager_mobile,
        manager_email,
        opening_time,
        closing_time,
        meta
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id, name, city, state, pincode, country, manager_name, manager_mobile, manager_email, opening_time, closing_time, is_active, meta`,
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

    return successResponse({ store: insert.rows[0] }, 'Store created', 201);
  } catch (err) {
    return errorResponse(err.message || 'Unable to create store');
  }
}
