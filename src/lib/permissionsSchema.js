import { query } from '@/lib/db';

let ensured = false;

export async function ensurePermissionsSchema() {
  if (ensured) return;

  await query(`
    CREATE TABLE IF NOT EXISTS permissions (
      id SERIAL PRIMARY KEY,
      permission_for_org VARCHAR(50) NOT NULL DEFAULT 'MERCHANT',
      permission_for_interface VARCHAR(50) NOT NULL DEFAULT 'BOTH',
      permission_name VARCHAR(255) NOT NULL UNIQUE,
      display_name VARCHAR(255),
      description TEXT,
      meta JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // seed default permissions if table is empty
  const { rows } = await query('SELECT count(*)::int AS cnt FROM permissions');
  const count = rows && rows[0] ? Number(rows[0].cnt) : 0;
  if (count === 0) {
    const defaults = [
      ['MERCHANT', 'BOTH', 'ACCESS_DASHBOARD', 'Access Dashboard', 'Access the main dashboard'],
      ['MERCHANT', 'BOTH', 'MANAGE_ROLES', 'Manage Roles', 'Create and manage roles'],
      ['MERCHANT', 'BOTH', 'MANAGE_USERS', 'Manage Users', 'Invite and manage users'],
      ['MERCHANT', 'BOTH', 'MANAGE_INVENTORY', 'Manage Inventory', 'View and adjust stock and transfers'],
      ['MERCHANT', 'BOTH', 'MANAGE_CATALOG', 'Manage Catalog', 'Manage products and services'],
      ['MERCHANT', 'BOTH', 'MANAGE_ORDERS', 'Manage Orders', 'Create and manage sales orders'],
      ['MERCHANT', 'BOTH', 'MANAGE_PURCHASE_ORDERS', 'Manage Purchase Orders', 'Create and manage PO to vendors'],
      ['MERCHANT', 'BOTH', 'MANAGE_VENDORS', 'Manage Vendors', 'Manage vendor records and invoices'],
      ['MERCHANT', 'BOTH', 'MANAGE_CUSTOMERS', 'Manage Customers', 'Manage customer profiles and credits'],
      ['MERCHANT', 'BOTH', 'MANAGE_BILLING', 'Manage Billing', 'Configure billing and invoices'],
      ['MERCHANT', 'BOTH', 'MANAGE_PAYMENTS', 'Manage Payments', 'Record and reconcile payments'],
      ['MERCHANT', 'BOTH', 'VIEW_FINANCIAL_REPORTS', 'View Financial Reports', 'Access financial reporting'],
      ['MERCHANT', 'BOTH', 'MANAGE_PROMOS', 'Manage Promotions', 'Create and manage promotions'],
      ['MERCHANT', 'BOTH', 'MANAGE_TAXES', 'Manage Taxes', 'Configure tax settings'],
      ['MERCHANT', 'BOTH', 'MANAGE_STORES', 'Manage Stores', 'Create and manage store locations'],
    ];

    const insertPromises = defaults.map((d) =>
      query(
        `INSERT INTO permissions (permission_for_org, permission_for_interface, permission_name, display_name, description, meta, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW()) ON CONFLICT (permission_name) DO NOTHING`,
        [d[0], d[1], d[2], d[3], d[4], JSON.stringify({ seeded: true })]
      )
    );
    await Promise.all(insertPromises);
  }

  ensured = true;
}

export default null;
