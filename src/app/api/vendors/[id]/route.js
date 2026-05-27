import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureVendorsSchema } from '@/lib/vendorsSchema';
import { validatePhoneNumber } from '@/lib/phoneValidator';
import { requireAuth, requirePermission } from '@/lib/api-protection';

function mapVendor(r) {
  return {
    id: r.id,
    name: r.name,
    company: r.company,
    short_code: r.short_code,
    business: r.business,
    address_1: r.address_1,
    address_2: r.address_2,
    city: r.city,
    state: r.state,
    pincode: r.pincode,
    country: r.country,
    email: r.email,
    mobile_number: r.mobile_number,
    gst_number: r.gst_number,
    pan_number: r.pan_number,
    margin: Number(r.margin || 0),
    is_active: r.is_active !== false,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function normalizePayload(body) {
  const normalizedMobile = String(body.mobile_number || '').replace(/\D/g, '');
  const normalizedEmail = String(body.email || '').trim().toLowerCase();
  if (!String(body.name || '').trim()) throw new Error('Name is required');
  if (!normalizedMobile) throw new Error('Mobile number is required');
  if (!/^\d{10}$/.test(normalizedMobile)) throw new Error('Mobile number must be exactly 10 digits');
  if (!normalizedEmail) throw new Error('Email address is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error('Enter a valid email address');
  const phoneValidation = validatePhoneNumber(normalizedMobile);
  if (!phoneValidation.isValid) throw new Error(phoneValidation.error);

  return {
    name: String(body.name).trim(),
    company: body.company || null,
    short_code: body.short_code || null,
    business: body.business || null,
    address_1: body.address_1 || null,
    address_2: body.address_2 || null,
    city: body.city || null,
    state: body.state || null,
    pincode: body.pincode || null,
    country: body.country || null,
    email: normalizedEmail,
    mobile_number: normalizedMobile,
    gst_number: body.gst_number || null,
    pan_number: body.pan_number || null,
    margin: Number(body.margin || 0),
    is_active: body.is_active !== false,
  };
}

export async function GET(request, context) {
  try {
    await ensureVendorsSchema();
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const permissionCheck = requirePermission(auth.user, 'MANAGE_VENDORS', 'MANAGE_PURCHASE_ORDERS');
    if (permissionCheck.error) return permissionCheck.error;
    const { id } = await context.params;
    const res = await query(
      `SELECT id, name, company, short_code, business, address_1, address_2, city, state, pincode, country,
              email, mobile_number, gst_number, pan_number, margin, is_active, created_at, updated_at
       FROM vendors
       WHERE id = $1`,
      [id]
    );
    if (!res.rows[0]) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    return NextResponse.json(mapVendor(res.rows[0]));
  } catch (err) {
    console.error('[vendors GET id]', err.message);
    return NextResponse.json({ error: 'Failed to load vendor' }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    await ensureVendorsSchema();
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const permissionCheck = requirePermission(auth.user, 'MANAGE_VENDORS');
    if (permissionCheck.error) return permissionCheck.error;
    const { id } = await context.params;
    const payload = normalizePayload(await request.json());
    const res = await query(
      `UPDATE vendors SET
         name = $1,
         company = $2,
         short_code = $3,
         business = $4,
         address_1 = $5,
         address_2 = $6,
         city = $7,
         state = $8,
         pincode = $9,
         country = $10,
         email = $11,
         mobile_number = $12,
         gst_number = $13,
         pan_number = $14,
         margin = $15,
         is_active = $16,
         updated_at = NOW()
       WHERE id = $17
       RETURNING id, name, company, short_code, business, address_1, address_2, city, state, pincode, country,
                 email, mobile_number, gst_number, pan_number, margin, is_active, created_at, updated_at`,
      [
        payload.name,
        payload.company,
        payload.short_code,
        payload.business,
        payload.address_1,
        payload.address_2,
        payload.city,
        payload.state,
        payload.pincode,
        payload.country,
        payload.email,
        payload.mobile_number,
        payload.gst_number,
        payload.pan_number,
        payload.margin,
        payload.is_active,
        id,
      ]
    );
    if (!res.rows[0]) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    return NextResponse.json(mapVendor(res.rows[0]));
  } catch (err) {
    console.error('[vendors PUT id]', err.message);
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Vendor with same mobile, email or short code already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || 'Failed to update vendor' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    await ensureVendorsSchema();
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const permissionCheck = requirePermission(auth.user, 'MANAGE_VENDORS');
    if (permissionCheck.error) return permissionCheck.error;
    const { id } = await context.params;
    const usage = await query(
      `SELECT
         (SELECT COUNT(*) FROM purchase_orders WHERE vendor_id = $1)::int AS purchase_orders,
         (SELECT COUNT(*) FROM vendor_invoices WHERE vendor_id = $1)::int AS vendor_invoices`,
      [id]
    ).catch(() => ({ rows: [{ purchase_orders: 0, vendor_invoices: 0 }] }));
    const counts = usage.rows[0] || {};
    if (Number(counts.purchase_orders || 0) > 0 || Number(counts.vendor_invoices || 0) > 0) {
      await query('UPDATE vendors SET is_active = FALSE, updated_at = NOW() WHERE id = $1', [id]);
      return NextResponse.json({ success: true, archived: true });
    }
    const res = await query('DELETE FROM vendors WHERE id = $1 RETURNING id', [id]);
    if (!res.rows[0]) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    return NextResponse.json({ success: true, deleted: true });
  } catch (err) {
    console.error('[vendors DELETE id]', err.message);
    return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 });
  }
}
