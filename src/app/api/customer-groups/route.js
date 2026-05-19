import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureCustomerGroupsSchema } from '@/lib/customerGroupsSchema';

function normalizeText(value) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function mapCustomerGroupRow(row) {
  return {
    id: row.id,
    name: row.group_name,
    group_name: row.group_name,
    code: row.group_code,
    group_code: row.group_code,
    description: row.description || '',
    is_default: row.is_default,
    default: row.is_default,
    template_filename: row.template_filename || '',
    template_uploaded_at: row.template_uploaded_at,
    total_customers: row.total_customers,
    customers: row.total_customers,
    status: row.status,
    created_at: row.created_at,
  };
}

export async function GET() {
  try {
    await ensureCustomerGroupsSchema();
    const res = await query(
      `SELECT id, group_name, group_code, description, is_default, template_filename,
              template_uploaded_at, total_customers, status, created_at
       FROM customer_groups
       ORDER BY is_default DESC, created_at DESC, id DESC`
    );

    return NextResponse.json(res.rows.map(mapCustomerGroupRow));
  } catch (err) {
    console.error('[customer groups GET]', err.message);
    return NextResponse.json([]);
  }
}

export async function POST(request) {
  try {
    await ensureCustomerGroupsSchema();

    const body = await request.json();
    const groupName = normalizeText(body.group_name ?? body.groupName);
    const groupCode = normalizeText(body.group_code ?? body.groupCode);
    const description = normalizeText(body.description);
    const isDefault = normalizeBoolean(body.is_default ?? body.isDefault);
    const templateFilename = normalizeText(body.template_filename ?? body.templateFileName);

    if (!groupName) {
      return NextResponse.json({ error: 'Customer group name is required' }, { status: 400 });
    }

    if (!groupCode) {
      return NextResponse.json({ error: 'Customer group code is required' }, { status: 400 });
    }

    if (isDefault) {
      await query('UPDATE customer_groups SET is_default = FALSE, updated_at = NOW() WHERE is_default = TRUE');
    }

    const res = await query(
      `INSERT INTO customer_groups (
         group_name, group_code, description, is_default, template_filename, template_uploaded_at, total_customers, status
       ) VALUES ($1, $2, $3, $4, $5, $6, 0, 'Active')
       RETURNING id, group_name, group_code, description, is_default, template_filename, template_uploaded_at, total_customers, status, created_at`,
      [groupName, groupCode, description, isDefault, templateFilename, templateFilename ? new Date().toISOString() : null]
    );

    return NextResponse.json(mapCustomerGroupRow(res.rows[0]), { status: 201 });
  } catch (err) {
    console.error('[customer groups POST]', err.message);
    return NextResponse.json({ error: err.message || 'Failed to create customer group' }, { status: 500 });
  }
}
