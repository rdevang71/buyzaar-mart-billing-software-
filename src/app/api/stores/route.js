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
    const res = await query('SELECT id, name FROM stores ORDER BY name');
    // Return with `data.records` to match other catalog endpoints
    return successResponse({ records: res.rows }, 'Stores fetched');
  } catch (err) {
    console.error(err);
    return errorResponse('Failed to fetch stores');
  }
}
