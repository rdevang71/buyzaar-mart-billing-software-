import { successResponse, errorResponse, notFoundError } from '@/lib/api-response';
import { getClient, query } from '@/lib/db';
import { ensureStoresSchema } from '@/lib/storesSchema';

const STORE_DELETE_DEPENDENCIES = [
  { table: 'stock_in', column: 'destination_id', label: 'Stock In' },
  { table: 'stock_out', column: 'destination_id', label: 'Stock Out' },
  { table: 'stock_transfer', column: 'source_id', label: 'Stock Transfer (Source)' },
  { table: 'stock_transfer', column: 'destination_id', label: 'Stock Transfer (Destination)' },
  { table: 'stock_validation', column: 'destination_id', label: 'Stock Validation' },
  { table: 'purchase_orders', column: 'destination_id', label: 'Purchase Orders' },
];

async function tableExists(client, tableName) {
  const res = await client.query('SELECT to_regclass($1) AS regclass', [tableName]);
  return !!res.rows?.[0]?.regclass;
}

async function deleteStoreDependencies(client, storeId) {
  const deleted = [];

  for (const dep of STORE_DELETE_DEPENDENCIES) {
    const exists = await tableExists(client, dep.table);
    if (!exists) {
      continue;
    }

    const res = await client.query(
      `DELETE FROM ${dep.table} WHERE ${dep.column} = $1 RETURNING id`,
      [storeId]
    );

    deleted.push({
      table: dep.table,
      column: dep.column,
      label: dep.label,
      count: res.rowCount || 0,
    });
  }

  return deleted.filter((item) => item.count > 0);
}

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
        body.managerMobile || null,
        body.managerEmail || null,
        body.openingTime || null,
        body.closingTime || null,
        JSON.stringify(meta),
        storeId,
      ]
    );

    if (!update.rows.length) {
      return notFoundError('Store not found');
    }

    return successResponse({ store: update.rows[0] }, 'Store updated');
  } catch (err) {
    return errorResponse(err.message || 'Unable to update store');
  }
}

export async function DELETE(request, { params }) {
  let client;
  try {
    await ensureStoresSchema();
    const resolvedParams = await params;
    const storeId = Number(resolvedParams?.id);

    if (!Number.isFinite(storeId)) {
      return errorResponse('Invalid store id', 400);
    }

    client = await getClient();
    await client.query('BEGIN');

    const deletedDependencies = await deleteStoreDependencies(client, storeId);
    const del = await client.query('DELETE FROM stores WHERE id = $1 RETURNING id', [storeId]);
    if (!del.rows.length) {
      await client.query('ROLLBACK');
      return notFoundError('Store not found');
    }

    await client.query('COMMIT');

    return successResponse(
      { id: storeId, deletedDependencies },
      'Store and related records deleted'
    );
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Ignore rollback failures; original error is more useful for response.
      }
    }

    if (err?.code === '23503') {
      return errorResponse(
        'Store cannot be deleted because it is referenced by existing records.',
        409
      );
    }
    return errorResponse(err.message || 'Unable to delete store');
  } finally {
    client?.release();
  }
}
