import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureCustomersSchema } from '@/lib/customersSchema';

function normalizeText(value) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

function normalizeDate(value) {
  const text = normalizeText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function normalizeNumber(value) {
  if (value === '' || value === null || value === undefined) return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function mapCustomerRow(row) {
  return {
    id: row.id,
    name: [row.first_name, row.last_name].filter(Boolean).join(' ').trim(),
    first_name: row.first_name,
    last_name: row.last_name,
    customer_type: row.customer_type,
    customer_code: row.customer_code || '',
    email_address: row.email_address || '',
    birthday: row.birthday,
    mobile_number: row.mobile_number,
    address_type: row.address_type,
    city: row.city || '',
    state: row.state || '',
    country: row.country || '',
    pincode: row.pincode || '',
    address_1: row.address_1 || '',
    address_2: row.address_2 || '',
    landmark: row.landmark || '',
    anniversary: row.anniversary,
    gender: row.gender,
    gst_number: row.gst_number || '',
    pan_number: row.pan_number || '',
    aadhar_number: row.aadhar_number || '',
    contact_person_name: row.contact_person_name || '',
    contact_person_phone: row.contact_person_phone || '',
    registration_points: row.registration_points,
    credit_limit: row.credit_limit,
    enable_crm: row.enable_crm,
    notes: row.notes || '',
    total_sales: row.total_sales,
    status: row.status,
    created_at: row.created_at,
  };
}

export async function GET(request) {
  try {
    await ensureCustomersSchema();

    const { searchParams } = new URL(request.url);
    const statusFilter = normalizeText(searchParams.get('status'));
    const search = normalizeText(searchParams.get('search'));
    const searchBy = normalizeText(searchParams.get('searchBy'));
    const params = [];
    const where = [];

    if (statusFilter) {
      params.push(statusFilter);
      where.push(`status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;

      if (searchBy === 'Name') {
        where.push(`TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) ILIKE $${idx}`);
      } else if (searchBy === 'Phone') {
        where.push(`COALESCE(mobile_number, '') ILIKE $${idx}`);
      } else if (searchBy === 'Email') {
        where.push(`COALESCE(email_address, '') ILIKE $${idx}`);
      } else if (searchBy === 'GST Number') {
        where.push(`COALESCE(gst_number, '') ILIKE $${idx}`);
      } else if (searchBy === 'PAN Number') {
        where.push(`COALESCE(pan_number, '') ILIKE $${idx}`);
      } else if (searchBy === 'ID') {
        where.push(`CAST(id AS TEXT) ILIKE $${idx}`);
      } else {
        where.push(`(
          COALESCE(first_name, '') ILIKE $${idx}
          OR COALESCE(last_name, '') ILIKE $${idx}
          OR TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) ILIKE $${idx}
          OR COALESCE(customer_code, '') ILIKE $${idx}
          OR COALESCE(mobile_number, '') ILIKE $${idx}
          OR COALESCE(email_address, '') ILIKE $${idx}
        )`);
      }
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const res = await query(
      `SELECT id, first_name, last_name, customer_type, customer_code, email_address, birthday, mobile_number,
              address_type, city, state, country, pincode, address_1, address_2, landmark, anniversary,
              gender, gst_number, pan_number, aadhar_number, contact_person_name, contact_person_phone,
              registration_points, credit_limit, enable_crm, notes, total_sales, status, created_at
       FROM customers
       ${whereClause}
       ORDER BY created_at DESC, id DESC`
      ,
      params
    );

    return NextResponse.json(res.rows.map(mapCustomerRow));
  } catch (err) {
    console.error('[customers GET]', err.message);
    return NextResponse.json([]);
  }
}

export async function POST(request) {
  try {
    await ensureCustomersSchema();

    const body = await request.json();
    const firstName = normalizeText(body.first_name ?? body.firstName);
    const mobileNumber = normalizeText(body.mobile_number ?? body.mobileNumber);

    if (!firstName) {
      return NextResponse.json({ error: 'First name is required' }, { status: 400 });
    }

    if (!mobileNumber) {
      return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 });
    }

    const payload = {
      first_name: firstName,
      last_name: normalizeText(body.last_name ?? body.lastName),
      customer_type: normalizeText(body.customer_type ?? body.customerType) || 'INDIVIDUAL',
      customer_code: normalizeText(body.customer_code ?? body.customerCode),
      email_address: normalizeText(body.email_address ?? body.emailAddress),
      birthday: normalizeDate(body.birthday),
      mobile_number: mobileNumber,
      address_type: normalizeText(body.address_type ?? body.addressType) || 'Billing',
      city: normalizeText(body.city),
      state: normalizeText(body.state),
      country: normalizeText(body.country) || 'India',
      pincode: normalizeText(body.pincode),
      address_1: normalizeText(body.address_1 ?? body.address1),
      address_2: normalizeText(body.address_2 ?? body.address2),
      landmark: normalizeText(body.landmark),
      anniversary: normalizeDate(body.anniversary),
      gender: normalizeText(body.gender) || 'MALE',
      gst_number: normalizeText(body.gst_number ?? body.gstNumber),
      pan_number: normalizeText(body.pan_number ?? body.panNumber),
      aadhar_number: normalizeText(body.aadhar_number ?? body.aadharNumber),
      contact_person_name: normalizeText(body.contact_person_name ?? body.contactPersonName),
      contact_person_phone: normalizeText(body.contact_person_phone ?? body.contactPersonPhone),
      registration_points: normalizeNumber(body.registration_points ?? body.registrationPoints),
      credit_limit: normalizeNumber(body.credit_limit ?? body.creditLimit),
      enable_crm: Boolean(body.enable_crm ?? body.enableCrm),
      notes: normalizeText(body.notes),
    };

    const customerCode = payload.customer_code || `CUST-${Date.now()}`;

    const res = await query(
      `INSERT INTO customers (
         first_name, last_name, customer_type, customer_code, email_address, birthday, mobile_number,
         address_type, city, state, country, pincode, address_1, address_2, landmark, anniversary,
         gender, gst_number, pan_number, aadhar_number, contact_person_name, contact_person_phone,
         registration_points, credit_limit, enable_crm, notes, total_sales, status
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,
         $8,$9,$10,$11,$12,$13,$14,$15,$16,
         $17,$18,$19,$20,$21,$22,
         $23,$24,$25,$26,0,'Active'
       )
       RETURNING id, first_name, last_name, customer_type, customer_code, email_address, birthday, mobile_number,
                 address_type, city, state, country, pincode, address_1, address_2, landmark, anniversary,
                 gender, gst_number, pan_number, aadhar_number, contact_person_name, contact_person_phone,
                 registration_points, credit_limit, enable_crm, notes, total_sales, status, created_at`,
      [
        payload.first_name,
        payload.last_name,
        payload.customer_type,
        customerCode,
        payload.email_address,
        payload.birthday,
        payload.mobile_number,
        payload.address_type,
        payload.city,
        payload.state,
        payload.country,
        payload.pincode,
        payload.address_1,
        payload.address_2,
        payload.landmark,
        payload.anniversary,
        payload.gender,
        payload.gst_number,
        payload.pan_number,
        payload.aadhar_number,
        payload.contact_person_name,
        payload.contact_person_phone,
        payload.registration_points,
        payload.credit_limit,
        payload.enable_crm,
        payload.notes,
      ]
    );

    return NextResponse.json(mapCustomerRow(res.rows[0]), { status: 201 });
  } catch (err) {
    console.error('[customers POST]', err.message);
    return NextResponse.json({ error: err.message || 'Failed to create customer' }, { status: 500 });
  }
}