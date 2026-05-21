import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { ensureEmployeesSchema } from '@/lib/employeesSchema';
import { ensureUsersTable, normalizePhone, normalizeEmail } from '@/lib/userAuth';
import { getClient, query } from '@/lib/db';
import { ensureEmployeesSchema } from '@/lib/employeesSchema';
import { normalizePhone } from '@/lib/userAuth';

function toDate(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function toString(value) {
  return String(value ?? '').trim();
}


function normalizePermissions(input) {
  if (Array.isArray(input)) return input.filter(Boolean);
  if (typeof input === 'string') return input.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}

function normalizeStoreIds(input) {
  if (Array.isArray(input)) return input.map(Number).filter(Number.isFinite);
  if (typeof input === 'string') return input.split(',').map((item) => Number(item.trim())).filter(Number.isFinite);
  const single = Number(input);
  return Number.isFinite(single) ? [single] : [];
}

function normalizeSystemRole(roleName, userType) {
  const value = String(roleName || userType || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (value === 'super_admin' || value === 'superadmin') return 'super_admin';
  if (value === 'admin' || value === 'administrator') return 'admin';
  if (value === 'manager' || value === 'store_manager') return 'manager';
  return 'user';
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
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

function validateEmployeeInput({ username, firstName, password, confirmPassword, mobileNumber, emailAddress, roleId, roleName, permissions }) {
  if (!username) return 'Username is required';
  if (!firstName) return 'First name is required';
  if (!mobileNumber) return 'Mobile number is required';
  if (!/^\d{10}$/.test(mobileNumber)) return 'Mobile number must be exactly 10 digits';
  if (!emailAddress) return 'Email address is required';
  if (!isValidEmail(emailAddress)) return 'Enter a valid email address';
  if (!roleId && !roleName) return 'Role is required';
  if (!Array.isArray(permissions) || permissions.length === 0) return 'Select at least one permission';
  if (password && password !== confirmPassword) return 'Passwords do not match';
  return '';
}

async function resolveEmployeeId(params) {
  const resolvedParams = await params;
  const employeeId = Number(resolvedParams?.id);
  return Number.isFinite(employeeId) && employeeId > 0 ? employeeId : null;
}

export async function PUT(request, { params }) {
  const client = await getClient();
  try {
    await ensureEmployeesSchema();

    const employeeId = await resolveEmployeeId(params);
    if (!employeeId) {
      return NextResponse.json({ error: 'Invalid employee id' }, { status: 400 });
    }

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
    const assignedStores = normalizeStoreIds(body.assigned_stores || body.assignedStores || body.store_ids || body.storeIds || body.store_id || body.storeId);
    const permissions = normalizePermissions(body.permissions);
    const regionStore = toString(body.region_store || body.regionStore);
    const warehouse = toString(body.warehouse);
    const departmentId = body.department_id ?? body.departmentId ?? null;
    const departmentName = toString(body.department_name || body.departmentName);
    const customerName = toString(body.customer_name || body.customerName);
    const userType = toString(body.user_type || body.userType);
    const systemRole = normalizeSystemRole(roleName, body.system_role || body.systemRole || body.user_role || body.userRole || userType);
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

    const validationError = validateEmployeeInput({
      username,
      firstName,
      password,
      confirmPassword,
      mobileNumber,
      emailAddress,
      roleId,
      roleName,
      permissions,
    });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await client.query('BEGIN');

    const existingRes = await client.query('SELECT id, user_id FROM employees WHERE id = $1 FOR UPDATE', [employeeId]);
    const existing = existingRes.rows[0];
    if (!existing) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const employeeRes = await client.query(
      `UPDATE employees
       SET username = $2,
           first_name = $3,
           last_name = $4,
           gender = $5,
           mobile_number = $6,
           email_address = $7,
           role_id = $8,
           role_name = $9,
           permissions = $10::jsonb,
           region_store = $11,
           warehouse = $12,
           department_id = $13,
           department_name = $14,
           customer_name = $15,
           user_type = $16,
           date_of_birth = $17,
           date_of_joining = $18,
           date_of_leaving = $19,
           employee_code = $20,
           create_customer_same_details = $21,
           discount_limit_type = $22,
           discount_limit_value = $23,
           maximum_discount_amount = $24,
           address = $25,
           employment_type = $26,
           employment_status = $27,
           contractor_name = $28,
           meta = $29::jsonb,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        employeeId,
        username,
        firstName,
        lastName || null,
        gender || null,
        mobileNumber,
        emailAddress,
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

    if (existing.user_id) {
      if (password) {
        const passwordHash = await bcrypt.hash(password, 10);
        await client.query(
          `UPDATE users
           SET name = $2, email = $3, phone = $4, role = $5, password_hash = $6, updated_at = NOW()
           WHERE id = $1`,
          [existing.user_id, [firstName, lastName].filter(Boolean).join(' ').trim() || username, emailAddress, mobileNumber, systemRole, passwordHash]
        );
      } else {
        await client.query(
          `UPDATE users
           SET name = $2, email = $3, phone = $4, role = $5, updated_at = NOW()
           WHERE id = $1`,
          [existing.user_id, [firstName, lastName].filter(Boolean).join(' ').trim() || username, emailAddress, mobileNumber, systemRole]
        );
      }

      await client.query('DELETE FROM user_stores WHERE user_id = $1', [existing.user_id]);
      for (const storeId of assignedStores) {
        await client.query(
          `INSERT INTO user_stores (user_id, store_id, is_active, created_at, updated_at)
           VALUES ($1, $2, TRUE, NOW(), NOW())
           ON CONFLICT (user_id, store_id) DO UPDATE
           SET is_active = TRUE, updated_at = NOW()`,
          [existing.user_id, storeId]
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json(mapEmployeeRow(employeeRes.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Employee username, email, or mobile already exists' }, { status: 409 });
    }

    console.error('[employee staff PUT]', err.message);
    return NextResponse.json({ error: err.message || 'Failed to update employee' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request, { params }) {
  try {
    await ensureEmployeesSchema();

    const employeeId = await resolveEmployeeId(params);
    if (!employeeId) {
      return NextResponse.json({ error: 'Invalid employee id' }, { status: 400 });
    }

    const res = await query(
      `DELETE FROM employees WHERE id = $1 RETURNING id`,
      [employeeId]
    );

    if (!res.rows.length) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: 'Employee deleted successfully', id: employeeId },
      { status: 200 }
    );
  } catch (err) {
    console.error('[employee staff DELETE]', err.message);
    return NextResponse.json(
      { error: err.message || 'Failed to delete employee' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  const client = await getClient();
  try {
    const resolvedParams = await params;
    const employeeId = Number(resolvedParams?.id);

    if (!Number.isFinite(employeeId)) {
      return NextResponse.json({ error: 'Invalid employee id' }, { status: 400 });
    }

    await ensureEmployeesSchema();
    await ensureUsersTable();

    const body = await request.json();
    const firstName = toString(body.first_name || body.firstName);
    const lastName = toString(body.last_name || body.lastName);
    const username = toString(body.username);
    const mobileNumber = normalizePhone(body.mobile_number || body.mobileNumber || '');
    const emailAddress = normalizeEmail(body.email_address || body.emailAddress || '');
    const assignedStores = normalizeStoreIds(body.assigned_stores || body.assignedStores || body.store_ids || body.storeIds || body.store_id || body.storeId);
    const permissions = normalizePermissions(body.permissions);
    const roleId = body.role_id ?? body.roleId ?? null;
    const roleName = toString(body.role_name || body.roleName);
    const systemRole = normalizeSystemRole(roleName, body.user_type || body.userType);
    const password = toString(body.password || '');

    await client.query('BEGIN');

    const empRes = await client.query('SELECT * FROM employees WHERE id = $1', [employeeId]);
    if (!empRes.rows.length) {
      await client.query('ROLLBACK').catch(() => {});
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const existing = empRes.rows[0];
    let userId = existing.user_id;

    // If there's no linked user, create one
    if (!userId) {
      const fallbackToken = String(Date.now());
      const passwordHash = password ? await bcrypt.hash(password, 10) : await bcrypt.hash(fallbackToken, 10);
      const insertUser = await client.query(
        `INSERT INTO users (name, email, phone, password_hash, role, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW()) RETURNING id`,
        [[firstName, lastName].filter(Boolean).join(' ').trim() || username, emailAddress || `${username || 'employee'}-${fallbackToken}@example.com`, mobileNumber || `emp-${fallbackToken.slice(0,12)}`, passwordHash, systemRole]
      );
      userId = insertUser.rows[0].id;
      await client.query('UPDATE employees SET user_id = $1 WHERE id = $2', [userId, employeeId]);
    } else {
      // Update user fields if provided
      const updates = [];
      const paramsArr = [];
      let idx = 1;
      if (firstName || lastName) {
        updates.push(`name = $${idx++}`);
        paramsArr.push([firstName, lastName].filter(Boolean).join(' ').trim() || username);
      }
      if (emailAddress) {
        updates.push(`email = $${idx++}`);
        paramsArr.push(emailAddress);
      }
      if (mobileNumber) {
        updates.push(`phone = $${idx++}`);
        paramsArr.push(mobileNumber);
      }
      if (password) {
        const passwordHash = await bcrypt.hash(password, 10);
        updates.push(`password_hash = $${idx++}`);
        paramsArr.push(passwordHash);
      }
      if (systemRole) {
        updates.push(`role = $${idx++}`);
        paramsArr.push(systemRole);
      }

      if (updates.length) {
        paramsArr.push(userId);
        await client.query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, paramsArr);
      }
    }

    // Deactivate all existing user_stores for this user
    if (userId) {
      await client.query(`UPDATE user_stores SET is_active = FALSE, updated_at = NOW() WHERE user_id = $1`, [userId]);
      for (const storeId of assignedStores) {
        await client.query(
          `INSERT INTO user_stores (user_id, store_id, is_active, created_at, updated_at)
           VALUES ($1, $2, TRUE, NOW(), NOW())
           ON CONFLICT (user_id, store_id) DO UPDATE
           SET is_active = TRUE, updated_at = NOW()`,
          [userId, storeId]
        );
      }
    }

    // Update employees row
    const updateRes = await client.query(
      `UPDATE employees SET
         username = $1,
         first_name = $2,
         last_name = $3,
         mobile_number = $4,
         email_address = $5,
         role_id = $6,
         role_name = $7,
         permissions = $8::jsonb,
         region_store = $9,
         warehouse = $10,
         department_id = $11,
         department_name = $12,
         customer_name = $13,
         user_type = $14,
         date_of_birth = $15,
         date_of_joining = $16,
         date_of_leaving = $17,
         employee_code = $18,
         create_customer_same_details = $19,
         discount_limit_type = $20,
         discount_limit_value = $21,
         maximum_discount_amount = $22,
         address = $23,
         employment_type = $24,
         employment_status = $25,
         contractor_name = $26,
         meta = $27::jsonb,
         updated_at = NOW()
       WHERE id = $28 RETURNING *`,
      [
        username || existing.username,
        firstName || existing.first_name,
        lastName || existing.last_name,
        mobileNumber || existing.mobile_number,
        emailAddress || existing.email_address,
        roleId || existing.role_id,
        roleName || existing.role_name,
        JSON.stringify(permissions.length ? permissions : existing.permissions || []),
        body.region_store ?? existing.region_store,
        body.warehouse ?? existing.warehouse,
        body.department_id ?? existing.department_id,
        body.department_name ?? existing.department_name,
        body.customer_name ?? existing.customer_name,
        body.user_type ?? existing.user_type,
        body.date_of_birth ?? existing.date_of_birth,
        body.date_of_joining ?? existing.date_of_joining,
        body.date_of_leaving ?? existing.date_of_leaving,
        body.employee_code ?? existing.employee_code,
        Boolean(body.create_customer_same_details ?? existing.create_customer_same_details),
        body.discount_limit_type ?? existing.discount_limit_type,
        body.discount_limit_value ?? existing.discount_limit_value,
        body.maximum_discount_amount ?? existing.maximum_discount_amount,
        body.address ?? existing.address,
        body.employment_type ?? existing.employment_type,
        body.employment_status ?? existing.employment_status,
        body.contractor_name ?? existing.contractor_name,
        JSON.stringify(body),
        employeeId,
      ]
    );

    await client.query('COMMIT');

    if (!updateRes.rows.length) {
      return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: employeeId, employee: updateRes.rows[0] }, { status: 200 });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Employee username or email already exists' }, { status: 409 });
    }
    console.error('[employee staff PUT]', err.message);
    return NextResponse.json({ error: err.message || 'Failed to update employee' }, { status: 500 });
  } finally {
    client.release();
  }
}
