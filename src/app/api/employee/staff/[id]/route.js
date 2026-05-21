import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { ensureEmployeesSchema } from '@/lib/employeesSchema';
import { ensureUsersTable, normalizePhone, normalizeEmail } from '@/lib/userAuth';

function toString(value) {
  return String(value ?? '').trim();
}

function normalizeStoreIds(input) {
  if (Array.isArray(input)) return input.map(Number).filter(Number.isFinite);
  if (typeof input === 'string') return input.split(',').map((s) => Number(s.trim())).filter(Number.isFinite);
  const single = Number(input);
  return Number.isFinite(single) ? [single] : [];
}

function normalizePermissions(input) {
  if (Array.isArray(input)) return input.filter(Boolean);
  if (typeof input === 'string') return input.split(',').map((i) => i.trim()).filter(Boolean);
  return [];
}

function normalizeSystemRole(roleName, userType) {
  const value = String(roleName || userType || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (value === 'super_admin' || value === 'superadmin') return 'super_admin';
  if (value === 'admin' || value === 'administrator') return 'admin';
  if (value === 'manager' || value === 'store_manager') return 'manager';
  return 'user';
}

export async function DELETE(request, { params }) {
  try {
    const resolvedParams = await params;
    const employeeId = Number(resolvedParams?.id);

    if (!Number.isFinite(employeeId)) {
      return NextResponse.json({ error: 'Invalid employee id' }, { status: 400 });
    }

    // Delete from employees table
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