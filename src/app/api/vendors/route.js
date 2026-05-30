import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureStockInSchema } from '@/lib/stockInSchema';
import { ensureStockOutSchema } from '@/lib/stockOutSchema';
import { ensureVendorsSchema } from '@/lib/vendorsSchema';
import { validatePhoneNumber } from '@/lib/phoneValidator';
import { requireAuth, requirePermission } from '@/lib/api-protection';

function mapVendor(r) {
  return {
    id: r.id,
    name: r.name,
    company: r.company,
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
    margin: Number(r.margin || 0),
    is_active: r.is_active !== false,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function GET(req) {
  try {
    // ensure any legacy tables used elsewhere and the vendors table
    await ensureStockInSchema();
    await ensureStockOutSchema();
    await ensureVendorsSchema();
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;
    const permissionCheck = requirePermission(auth.user, 'MANAGE_VENDORS', 'MANAGE_PURCHASE_ORDERS');
    if (permissionCheck.error) return permissionCheck.error;

    const { searchParams } = new URL(req.url);
    const search = String(searchParams.get('search') || '').trim();
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize') || 200), 1), 500);
    const params = [];
    const conditions = [];

    if (!includeInactive) conditions.push('COALESCE(is_active, TRUE) = TRUE');
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(
        name ILIKE $${params.length}
        OR COALESCE(company, '') ILIKE $${params.length}
        OR COALESCE(short_code, '') ILIKE $${params.length}
        OR COALESCE(email, '') ILIKE $${params.length}
        OR COALESCE(mobile_number, '') ILIKE $${params.length}
        OR COALESCE(gst_number, '') ILIKE $${params.length}
      )`);
    }
    params.push(pageSize);

    const res = await query(
          `SELECT id, name, company, business, address_1, address_2, city, state, pincode, country,
            email, mobile_number, gst_number, margin, is_active, created_at, updated_at
       FROM vendors
       ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
       ORDER BY name
       LIMIT $${params.length}`,
      params
    );

    // return array of vendor objects; keeping `name` property for backward compatibility
    return NextResponse.json(res.rows.map(mapVendor));
  } catch (err) {
    console.error('Vendors GET error', err);
    return NextResponse.json([]);
  }
}

export async function POST(req) {
  try {
    await ensureVendorsSchema();
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;
    const permissionCheck = requirePermission(auth.user, 'MANAGE_VENDORS');
    if (permissionCheck.error) return permissionCheck.error;
    const body = await req.json();
    const {
      name,
      company,
      business,
      address_1,
      address_2,
      city,
      state,
      pincode,
      country,
      email,
      mobile_number,
      gst_number,
      margin,
    } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const normalizedMobile = String(mobile_number || '').replace(/\D/g, '');
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedMobile) {
      return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 });
    }
    if (!/^\d{10}$/.test(normalizedMobile)) {
      return NextResponse.json({ error: 'Mobile number must be exactly 10 digits' }, { status: 400 });
    }
    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    if (!String(gst_number || '').trim()) {
      return NextResponse.json({ error: 'GST number is required' }, { status: 400 });
    }

    const res = await query(
      `INSERT INTO vendors (
         name, company, business, address_1, address_2, city, state, pincode, country,
         email, mobile_number, gst_number, margin, is_active, created_at, updated_at
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, TRUE, NOW(), NOW())
       RETURNING id, name, company, business, address_1, address_2, city, state, pincode, country,
                 email, mobile_number, gst_number, margin, is_active, created_at, updated_at`,
      [
        String(name).trim(),
        company || null,
        business || null,
        address_1 || null,
        address_2 || null,
        city || null,
        state || null,
        pincode || null,
        country || null,
        normalizedEmail || null,
        normalizedMobile,
        String(gst_number).trim(),
        Number(margin || 0),
      ]
    );

    return NextResponse.json(mapVendor(res.rows[0]), { status: 201 });
  } catch (err) {
    console.error('Vendors POST error', err);
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Vendor with same mobile or email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || 'Failed to create vendor' }, { status: 500 });
  }
}
