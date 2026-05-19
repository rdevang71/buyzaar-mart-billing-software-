import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getClient, query } from '@/lib/db';
import { ensureEmployeesSchema } from '@/lib/employeesSchema';
import { ensureUsersTable, normalizePhone } from '@/lib/userAuth';

// FIXED: Properly handle date strings without timezone corruption
function toDate(value) {
  if (!value) return null;
  
  // If it's already a YYYY-MM-DD string, validate and return as-is
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value + 'T00:00:00Z');
    if (Number.isNaN(date.getTime())) return null;
    return value; // Return the original string
  }
  
  // For other formats, parse and convert to YYYY-MM-DD
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  
  // Use UTC to avoid timezone issues
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toString(value) {
  return String(value ?? '').trim();
}

function normalizePermissions(input) {
  if (Array.isArray(input)) return input.filter(Boolean);
  if (typeof input === 'string') {
    return input.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function mapEmployeeRow(row) {
  return {
    id: row.id,
    username: row.username,
    name: [row.first_name, row.last_name].filter(Boolean).join(' ').trim(),
    firstName: row.first_name,
    lastName: row.last_name,
    employeeCode: row.employee_code || '',
    role: row.role_name || '',
    department: row.department_name || '',
    employeeType: row.employment_type || '',
    contractorName: row.contractor_name || '',
    mobileNumber: row.mobile_number || '',
    emailAddress: row.email_address || '',
    employmentStatus: row.employment_status || 'Active',
    gender: row.gender || '',
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    regionStore: row.region_store || '',
    warehouse: row.warehouse || '',
    userType: row.user_type || '',
    dateOfBirth: row.date_of_birth || null,
    dateOfJoining: row.date_of_joining || null,
    dateOfLeaving: row.date_of_leaving || null,
    customerName: row.customer_name || '',
    address: row.address || '',
    discountLimitType: row.discount_limit_type || '',
    discountLimitValue: row.discount_limit_value || null,
    maximumDiscountAmount: row.maximum_discount_amount || null,
    createCustomerSameDetails: row.create_customer_same_details || false,
    createdAt: row.created_at,
  };
}

export async function GET() {
  try {
    await ensureEmployeesSchema();

    const res = await query(
      `SELECT e.id,
              e.username,
              e.first_name,
              e.last_name,
              e.gender,
              e.mobile_number,
              e.email_address,
              e.role_name,
              e.permissions,
              e.region_store,
              e.warehouse,
              e.department_name,
              e.customer_name,
              e.user_type,
              e.date_of_birth,
              e.date_of_joining,
              e.date_of_leaving,
              e.employee_code,
              e.create_customer_same_details,
              e.discount_limit_type,
              e.discount_limit_value,
              e.maximum_discount_amount,
              e.address,
              e.employment_type,
              e.employment_status,
              e.contractor_name,
              e.created_at
       FROM employees e
       ORDER BY e.created_at DESC, e.id DESC`
    );

    return NextResponse.json(res.rows.map(mapEmployeeRow));
  } catch (err) {
    console.error('[employee staff GET]', err.message);
    return NextResponse.json([]);
  }
}

export async function POST(request) {
  const client = await getClient();
  try {
    await ensureEmployeesSchema();

    const body = await request.json();
    const username = toString(body.username);
    const firstName = toString(body.first_name || body.firstName);
    const lastName = toString(body.last_name || body.lastName);
    const gender = toString(body.gender);
    const password = toString(body.password);
    const confirmPassword = toString(body.confirm_password || body.confirmPassword);
    const mobileNumber = normalizePhone(body.mobile_number || body.mobileNumber || '');
    const emailAddress = toString(body.email_address || body.emailAddress).toLowerCase();
    const roleId = body.role_id ?? body.roleId ?? null;
    const roleName = toString(body.role_name || body.roleName);
    const permissions = normalizePermissions(body.permissions);
    const regionStore = toString(body.region_store || body.regionStore);
    const warehouse = toString(body.warehouse);
    const departmentId = body.department_id ?? body.departmentId ?? null;
    const departmentName = toString(body.department_name || body.departmentName);
    const customerName = toString(body.customer_name || body.customerName);
    const userType = toString(body.user_type || body.userType);
    const dateOfBirth = toDate(body.date_of_birth || body.dateOfBirth);
    const dateOfJoining = toDate(body.date_of_joining || body.dateOfJoining);
    const dateOfLeaving = toDate(body.date_of_leaving || body.dateOfLeaving);
    const employeeCode = toString(body.employee_code || body.employeeCode);
    const createCustomerSameDetails = Boolean(body.create_customer_same_details || body.createCustomerSameDetails);
    const discountLimitType = toString(body.discount_limit_type || body.discountLimitType);
    const discountLimitValue = body.discount_limit_value ?? body.discountLimitValue ?? null;
    const maximumDiscountAmount = body.maximum_discount_amount ?? body.maximumDiscountAmount ?? null;
    const address = toString(body.address);
    const employmentType = toString(body.employment_type || body.employmentType);
    const employmentStatus = toString(body.employment_status || body.employmentStatus) || 'Active';
    const contractorName = toString(body.contractor_name || body.contractorName);

    if (!username) return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    if (!firstName) return NextResponse.json({ error: 'First name is required' }, { status: 400 });
    if (!password) return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(password, 10);
    const fallbackToken = randomUUID();
    const userRes = await client.query(
      `INSERT INTO users (name, email, phone, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())
       RETURNING id`,
      [
        [firstName, lastName].filter(Boolean).join(' ').trim() || username,
        emailAddress || `${username || 'employee'}-${fallbackToken}@example.com`,
        mobileNumber || `emp-${fallbackToken.slice(0, 12)}`,
        passwordHash,
        'user',
      ]
    );

    const employeeRes = await client.query(
      `INSERT INTO employees (
        user_id, username, first_name, last_name, gender, mobile_number, email_address,
        role_id, role_name, permissions, region_store, warehouse, department_id, department_name,
        customer_name, user_type, date_of_birth, date_of_joining, date_of_leaving, employee_code,
        create_customer_same_details, discount_limit_type, discount_limit_value, maximum_discount_amount,
        address, employment_type, employment_status, contractor_name, meta, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10::jsonb, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24,
        $25, $26, $27, $28, $29::jsonb, NOW(), NOW()
      )
      RETURNING *`,
      [
        userRes.rows[0].id,
        username,
        firstName,
        lastName || null,
        gender || null,
        mobileNumber || null,
        emailAddress || null,
        roleId || null,
        roleName || null,
        JSON.stringify(permissions),
        regionStore || null,
        warehouse || null,
        departmentId || null,
        departmentName || null,
        customerName || null,
        userType || null,
        dateOfBirth,
        dateOfJoining,
        dateOfLeaving,
        employeeCode || null,
        createCustomerSameDetails,
        discountLimitType || null,
        discountLimitValue || null,
        maximumDiscountAmount || null,
        address || null,
        employmentType || null,
        employmentStatus,
        contractorName || null,
        JSON.stringify(body),
      ]
    );

    await client.query('COMMIT');
    return NextResponse.json(mapEmployeeRow(employeeRes.rows[0]), { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});

    if (err.code === '23505') {
      return NextResponse.json({ error: 'Employee username or email already exists' }, { status: 409 });
    }

    console.error('[employee staff POST]', err.message);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  } finally {
    client.release();
  }
}
