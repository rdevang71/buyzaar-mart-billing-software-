import { query } from '@/lib/db';

const CREATE_SERVICE_GROUPS_SQL = `
  CREATE TABLE IF NOT EXISTS service_groups (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50),
    sort_sequence INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const CREATE_SERVICE_DEPARTMENTS_SQL = `
  CREATE TABLE IF NOT EXISTS service_departments (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    service_group_id BIGINT REFERENCES service_groups(id) ON DELETE SET NULL,
    sort_sequence INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const CREATE_SERVICES_SQL = `
  CREATE TABLE IF NOT EXISTS services (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    service_group_id BIGINT REFERENCES service_groups(id) ON DELETE SET NULL,
    service_department_id BIGINT REFERENCES service_departments(id) ON DELETE SET NULL,
    price NUMERIC(14, 2) NOT NULL DEFAULT 0,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    hsn_code VARCHAR(60),
    sku VARCHAR(120),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const CREATE_PRODUCT_SALEABILITY_SQL = `
  CREATE TABLE IF NOT EXISTS product_saleability (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    store_id BIGINT REFERENCES stores(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    selling_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
    mrp NUMERIC(14, 2) NOT NULL DEFAULT 0,
    low_stock_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, store_id)
  );
`;

const CREATE_PRODUCT_WAREHOUSES_SQL = `
  CREATE TABLE IF NOT EXISTS product_warehouses (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id BIGINT REFERENCES stores(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, warehouse_id)
  );
`;

const CREATE_PROMOTIONS_SQL = `
  CREATE TABLE IF NOT EXISTS promotions (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    promotion_type VARCHAR(60) NOT NULL DEFAULT 'Discount',
    discount_value VARCHAR(60) NOT NULL DEFAULT '0',
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const CREATE_VOUCHERS_SQL = `
  CREATE TABLE IF NOT EXISTS vouchers (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(120) NOT NULL UNIQUE,
    value NUMERIC(14, 2) NOT NULL DEFAULT 0,
    min_order NUMERIC(14, 2) NOT NULL DEFAULT 0,
    expiry_date DATE,
    used_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const CREATE_MEMBERSHIPS_SQL = `
  CREATE TABLE IF NOT EXISTS memberships (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    discount VARCHAR(60) NOT NULL DEFAULT '0%',
    validity VARCHAR(60) NOT NULL DEFAULT '1 Year',
    members INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const CREATE_COMBOS_SQL = `
  CREATE TABLE IF NOT EXISTS combos (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    items VARCHAR(120) NOT NULL DEFAULT '0 items',
    price NUMERIC(14, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const CREATE_PROMOTION_APPROVALS_SQL = `
  CREATE TABLE IF NOT EXISTS promotion_approvals (
    id BIGSERIAL PRIMARY KEY,
    promotion VARCHAR(255) NOT NULL,
    requested_by VARCHAR(255) NOT NULL,
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const CREATE_CHARGES_SQL = `
  CREATE TABLE IF NOT EXISTS charges (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    charge_type VARCHAR(50) NOT NULL DEFAULT 'FIXED',
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const CREATE_PRODUCT_GROUP_PRODUCTS_SQL = `
  CREATE TABLE IF NOT EXISTS product_group_products (
    id BIGSERIAL PRIMARY KEY,
    product_group_id BIGINT NOT NULL REFERENCES product_groups(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_group_id, product_id)
  );
`;

const CREATE_PRODUCT_GROUP_STORES_SQL = `
  CREATE TABLE IF NOT EXISTS product_group_stores (
    id BIGSERIAL PRIMARY KEY,
    product_group_id BIGINT NOT NULL REFERENCES product_groups(id) ON DELETE CASCADE,
    store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_group_id, store_id)
  );
`;

const globalForCatalogExtras = globalThis;

export async function ensureCatalogExtrasSchema() {
  if (!globalForCatalogExtras._catalogExtrasSchemaReadyPromise) {
    globalForCatalogExtras._catalogExtrasSchemaReadyPromise = (async () => {
      await query(CREATE_SERVICE_GROUPS_SQL);
      await query(CREATE_SERVICE_DEPARTMENTS_SQL);
      await query(CREATE_SERVICES_SQL);
          // add additional columns to services if they don't exist
          await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url TEXT;`);
          await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS available_for VARCHAR(60);`);
          await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS income_head_id BIGINT REFERENCES income_heads(id) ON DELETE SET NULL;`);
          await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS description TEXT;`);
          await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS sub_category_id BIGINT REFERENCES sub_categories(id) ON DELETE SET NULL;`);
          await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS show_in_receipt BOOLEAN NOT NULL DEFAULT true;`);
          await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS dynamic_pricing BOOLEAN NOT NULL DEFAULT false;`);
          await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS variable_pricing BOOLEAN NOT NULL DEFAULT false;`);
          await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS tax_id BIGINT REFERENCES taxes(id) ON DELETE SET NULL;`);
          await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS barcode VARCHAR(120);`);
          await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS extra_time_minutes INTEGER NOT NULL DEFAULT 0;`);
          await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS manage_inventory BOOLEAN NOT NULL DEFAULT false;`);
          await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS security_amount NUMERIC(14,2) NOT NULL DEFAULT 0;`);
          await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS reclaim_type VARCHAR(60);`);
          await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS reclaim_value NUMERIC(14,2) NOT NULL DEFAULT 0;`);
          await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS includes_tax BOOLEAN NOT NULL DEFAULT false;`);
          await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS metadata JSONB;`);

          // service_saleability: per-store price overrides for services
          await query(`
            CREATE TABLE IF NOT EXISTS service_saleability (
              id BIGSERIAL PRIMARY KEY,
              service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
              store_id BIGINT REFERENCES stores(id) ON DELETE CASCADE,
              price NUMERIC(14,2) NOT NULL DEFAULT 0,
              is_active BOOLEAN NOT NULL DEFAULT true,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              UNIQUE (service_id, store_id)
            );
          `);
      await query(CREATE_PRODUCT_SALEABILITY_SQL);
      await query(`
        ALTER TABLE product_saleability
          ADD COLUMN IF NOT EXISTS selling_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS mrp NUMERIC(14, 2) NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS low_stock_value NUMERIC(14, 2) NOT NULL DEFAULT 0;
      `);
      await query(CREATE_PROMOTIONS_SQL);
      await query(CREATE_VOUCHERS_SQL);
      await query(CREATE_MEMBERSHIPS_SQL);
      await query(CREATE_COMBOS_SQL);
      await query(CREATE_PROMOTION_APPROVALS_SQL);
      await query(CREATE_CHARGES_SQL);
      await query(CREATE_PRODUCT_GROUP_PRODUCTS_SQL);
      await query(CREATE_PRODUCT_GROUP_STORES_SQL);
      await query(`ALTER TABLE charges ADD COLUMN IF NOT EXISTS charge_applied_on VARCHAR(50) NOT NULL DEFAULT 'Product';`);
      await query(`ALTER TABLE charges ADD COLUMN IF NOT EXISTS apply_on_order_delivery BOOLEAN NOT NULL DEFAULT false;`);
      await query(`ALTER TABLE charges ADD COLUMN IF NOT EXISTS max_order_value NUMERIC(14,2) NOT NULL DEFAULT 0;`);
      await query(`ALTER TABLE charges ADD COLUMN IF NOT EXISTS tax_id BIGINT REFERENCES taxes(id) ON DELETE SET NULL;`);
      await query(`ALTER TABLE charges ADD COLUMN IF NOT EXISTS store_id BIGINT REFERENCES stores(id) ON DELETE SET NULL;`);
      await query(`ALTER TABLE charges ADD COLUMN IF NOT EXISTS apply_only_online_orders BOOLEAN NOT NULL DEFAULT false;`);
      await query(`ALTER TABLE charges ADD COLUMN IF NOT EXISTS order_type VARCHAR(60);`);
      await query(`ALTER TABLE charges ADD COLUMN IF NOT EXISTS channel VARCHAR(60);`);
      await query(`ALTER TABLE charges ADD COLUMN IF NOT EXISTS department_id BIGINT REFERENCES departments(id) ON DELETE SET NULL;`);
      await query(`ALTER TABLE taxes ADD COLUMN IF NOT EXISTS parent_tax_id BIGINT REFERENCES taxes(id) ON DELETE SET NULL;`);
      await query(`ALTER TABLE taxes ADD COLUMN IF NOT EXISTS store_id BIGINT REFERENCES stores(id) ON DELETE SET NULL;`);
    })().catch((err) => {
      globalForCatalogExtras._catalogExtrasSchemaReadyPromise = null;
      throw err;
    });
  }

  await globalForCatalogExtras._catalogExtrasSchemaReadyPromise;
}
