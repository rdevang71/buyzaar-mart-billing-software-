import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureStockInSchema } from '@/lib/stockInSchema';
import { ensureStockOutSchema } from '@/lib/stockOutSchema';
import { ensureVendorsSchema } from '@/lib/vendorsSchema';

export async function GET() {
  try {
    // ensure any legacy tables used elsewhere and the vendors table
    await ensureStockInSchema();
    await ensureStockOutSchema();
    await ensureVendorsSchema();

    const res = await query(
      `SELECT id, name, company, short_code, business, address_1, address_2, city, state, pincode, country, email, mobile_number, gst_number, pan_number, margin, created_at
       FROM vendors
       ORDER BY name
       LIMIT 100`);

    // return array of vendor objects; keeping `name` property for backward compatibility
    return NextResponse.json(res.rows.map((r) => ({
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
      margin: r.margin,
      created_at: r.created_at,
    })));
  } catch (err) {
    console.error('Vendors GET error', err);
    return NextResponse.json([]);
  }
}

export async function POST(req) {
  try {
    await ensureVendorsSchema();
    const body = await req.json();
    const {
      name,
      company,
      short_code,
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
      pan_number,
      margin,
    } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const res = await query(
      `INSERT INTO vendors (name, company, short_code, business, address_1, address_2, city, state, pincode, country, email, mobile_number, gst_number, pan_number, margin)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id, name, company, short_code, business, address_1, address_2, city, state, pincode, country, email, mobile_number, gst_number, pan_number, margin, created_at`,
      [name, company, short_code, business, address_1, address_2, city, state, pincode, country, email, mobile_number, gst_number, pan_number, margin]
    );

    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (err) {
    console.error('Vendors POST error', err);
    return NextResponse.json({ error: err.message || 'Failed to create vendor' }, { status: 500 });
  }
}
