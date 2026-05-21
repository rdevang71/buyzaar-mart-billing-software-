import { successResponse, errorResponse, notFoundError } from '@/lib/api-response';
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

export async function GET(request, { params }) {
  try {
    await ensureStoresSchema();
    const resolvedParams = await params;
    const storeId = Number(resolvedParams?.id);

    if (!Number.isFinite(storeId)) {
      return errorResponse('Invalid store id', 400);
    }

    const res = await query(
      `SELECT id, name, address_line1, address_line2, city, state, pincode, country, manager_name, manager_mobile, manager_email, opening_time, closing_time, is_active, meta, created_at, updated_at
       FROM stores
       WHERE id = $1
       LIMIT 1`,
      [storeId]
    );

    if (!res.rows.length) {
      return notFoundError('Store not found');
    }

    return successResponse({ store: res.rows[0] });
  } catch (err) {
    return errorResponse(err.message || 'Unable to fetch store');
  }
}

export async function PUT(request, { params }) {
  try {
    await ensureStoresSchema();
    const resolvedParams = await params;
    const storeId = Number(resolvedParams?.id);

    if (!Number.isFinite(storeId)) {
      return errorResponse('Invalid store id', 400);
    }

    const body = await request.json();
    const name = (body.name || '').trim();
    if (!name) {
      return errorResponse('Store name is required', 422);
    }
    const managerMobile = String(body.managerMobile || '').replace(/\D/g, '');
    const managerEmail = String(body.managerEmail || '').trim().toLowerCase();
    if (managerMobile && !/^\d{10}$/.test(managerMobile)) {
      return errorResponse('Mobile number must be exactly 10 digits', 422);
    }
    if (managerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(managerEmail)) {
      return errorResponse('Enter a valid e-mail address', 422);
    }

    const meta = buildStoreMeta(body);

    const update = await query(
      `UPDATE stores
       SET name = $1,
           address_line1 = $2,
           address_line2 = $3,
           city = $4,
           state = $5,
           pincode = $6,
           country = $7,
           manager_name = $8,
           manager_mobile = $9,
           manager_email = $10,
           opening_time = $11,
           closing_time = $12,
           meta = $13,
           updated_at = NOW()
       WHERE id = $14
       RETURNING id, name, address_line1, address_line2, city, state, pincode, country, manager_name, manager_mobile, manager_email, opening_time, closing_time, is_active, meta, created_at, updated_at`,
      [
        name,
        body.addressLine1 || null,
        body.addressLine2 || null,
        body.city || null,
        body.state || null,
        body.pincode || null,
        body.country || 'India',
        body.managerName || null,
        managerMobile || null,
        managerEmail || null,
        body.openingTime || null,
        body.closingTime || null,
        JSON.stringify(meta),
        storeId,
      ]
    );

    if (!update.rows.length) {
      return notFound('Store not found');
    }

    return successResponse({ store: update.rows[0] }, 'Store updated');
  } catch (err) {
    return errorResponse(err.message || 'Unable to update store');
  }
}

export async function DELETE(request, { params }) {
  try {
    await ensureStoresSchema();
    const resolvedParams = await params;
    const storeId = Number(resolvedParams?.id);

    if (!Number.isFinite(storeId)) {
      return errorResponse('Invalid store id', 400);
    }

    const del = await query('DELETE FROM stores WHERE id = $1 RETURNING id', [storeId]);
    if (!del.rows.length) {
      return notFound('Store not found');
    }

    return successResponse({ id: storeId }, 'Store deleted');
  } catch (err) {
    return errorResponse(err.message || 'Unable to delete store');
  }
}
