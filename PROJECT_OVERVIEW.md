# GroceryMart Billing Software - Project Overview

## Executive Summary
GroceryMart is an **enterprise-grade POS & Billing System** built with **Next.js 16**, **React 19**, and **PostgreSQL**. The system is modular with comprehensive database schemas supporting complex retail operations including inventory, sales, customer management, and advanced credit configurations.

---

## 1. TECH STACK

### Core Framework
- **Frontend**: Next.js 16.2.6 + React 19.2.4
- **Backend**: Next.js API Routes (monolithic structure)
- **Database**: PostgreSQL (pg v8.20.0)
- **Authentication**: JWT (jsonwebtoken ^9.0.3) + bcryptjs
- **UI Framework**: Tailwind CSS 4 + Tailwind PostCSS
- **Charts**: Recharts 3.8.1
- **Excel**: XLSX 0.18.5
- **Styling**: Tailwind CSS with PostCSS
- **Build Tool**: Next.js built-in

### Development
- Babel React Compiler for optimization
- JavaScript/JSX (no TypeScript)
- Environment variables for configuration

---

## 2. DATABASE SCHEMAS (29 Total)

### User & Access Control (4 schemas)
| Schema | Entity | Purpose |
|--------|--------|---------|
| `employeesSchema.js` | Employees | Staff members with roles & departments |
| `employeeDepartmentsSchema.js` | Employee Departments | Department classifications |
| `rolesSchema.js` | Roles | Permission sets (Admin, Manager, Cashier, etc.) |
| `permissionsSchema.js` | Permissions | Granular permission definitions |
| `userCounterSessionSchema.js` | Counter Sessions | User shift/session tracking |
| `passwordResetsSchema.js` | Password Resets | Password reset tokens & tracking |
| `sessionsSchema.js` | Sessions | User login sessions |

### Customer Management (11 schemas)
| Schema | Entity | Purpose |
|--------|--------|---------|
| `customersSchema.js` | Customers | Core customer data (individual/business) |
| `customerGroupsSchema.js` | Customer Groups | Customer segmentation |
| `customerCreditAdvancedConfigsSchema.js` | Credit Configs | Advanced credit rules per customer |
| `customerAdvancePaymentsSchema.js` | Advance Payments | Prepaid customer funds |
| `customerBalanceTransferSchema.js` | Balance Transfers | Credit transfers between customers |
| `customerOrderSettlementsSchema.js` | Order Settlements | Payment settlement tracking |
| `customerLoyaltySettingsSchema.js` | Loyalty Settings | Loyalty program configuration |
| `customerSmsCreditSchema.js` | SMS Credits | SMS messaging balance |
| `customerWhatsappCreditSchema.js` | WhatsApp Credits | WhatsApp messaging balance |
| `customerMessageHistorySchema.js` | Message History | Communication logs |

### Inventory & Stock (5 schemas)
| Schema | Entity | Purpose |
|--------|--------|---------|
| `stockInSchema.js` | Stock In | Inbound stock transactions |
| `stockOutSchema.js` | Stock Out | Outbound stock transactions |
| `stockTransferSchema.js` | Stock Transfer | Inter-store/warehouse transfers |
| `stockValidationSchema.js` | Stock Validation | Stock audit & verification records |

### Catalog & Products (2 schemas)
| Schema | Entity | Purpose |
|--------|--------|---------|
| `catalogExtrasSchema.js` | Catalog Extras | Additional product configurations |

### Sales & Billing (4 schemas)
| Schema | Entity | Purpose |
|--------|--------|---------|
| `salesBillingSchema.js` | Sales Bills | Point-of-sale transactions |
| `invoiceSalesOrdersSchema.js` | Invoice Sales Orders | Invoiced orders linking |

### Purchase & Vendors (3 schemas)
| Schema | Entity | Purpose |
|--------|--------|---------|
| `purchaseOrderSchema.js` | Purchase Orders | Vendor purchase requisitions |
| `vendorsSchema.js` | Vendors | Supplier information |
| `vendorInvoicesSchema.js` | Vendor Invoices | Vendor billing records |

### Location & Organization (2 schemas)
| Schema | Entity | Purpose |
|--------|--------|---------|
| `storesSchema.js` | Stores | Multi-store locations |
| `regionsSchema.js` | Regions | Geographic regions |

---

## 3. API ROUTES STRUCTURE

### Base Architecture
- **Location**: `src/app/api/`
- **Total Modules**: 30+ API modules
- **Pattern**: RESTful routes with Next.js `route.js` files
- **Auth**: JWT-based authentication middleware

### API Modules by Category

#### **Catalog Management** (25 endpoints)
```
/api/catalog/
├── assign-product-groups-store/    [Assign product groups to stores]
├── assign-products-store/          [Assign products to stores]
├── assign-products-warehouse/      [Assign products to warehouses]
├── brands/                         [Brand master data]
├── categories/                     [Product categories]
├── charges/                        [Additional charges/fees]
├── combos/                         [Bundle product configurations]
├── dashboard/                      [Catalog statistics]
├── departments/                    [Product departments]
├── import/                         [Bulk import products]
├── income-heads/                   [Income classification]
├── manufacturers/                  [Manufacturer data]
├── memberships/                    [Membership types]
├── product-groups/                 [Product grouping]
├── product-saleability/            [Saleability rules]
├── products/                       [Core product master]
├── promotion-approvals/            [Promotion workflow]
├── promotions/                     [Sales promotions]
├── service-departments/            [Service categories]
├── service-groups/                 [Service grouping]
├── services/                       [Service master]
├── sub-categories/                 [Product sub-categories]
├── taxes/                          [Tax configurations]
└── vouchers/                       [Discount vouchers]
```

#### **Inventory Management** (5 endpoints)
```
/api/inventory/
├── batches/                        [Batch/lot tracking]
├── stockin/                        [Inbound stock]
├── stockout/                       [Outbound stock]
├── stocktransfer/                  [Stock transfers]
└── stockvalidation/                [Stock audits]
```

#### **Sales Operations** (4 endpoints)
```
/api/sales-order/
├── closing/                        [Shift/period closing]
├── invoice-sales-order/            [Invoice linking]
├── pos/                            [Point-of-Sale transactions]
└── [view]/                         [Sales order viewing]
```

#### **Purchase Management** (1 endpoint)
```
/api/purchase/
└── grns/                           [Goods Received Notes]
```

#### **Employee Management** (5 endpoints)
```
/api/employee/
├── departments/                    [Employee departments]
├── permissions/                    [Permission management]
├── roles/                          [Role definitions]
├── staff/                          [Staff master]
└── user-counter-session/           [Counter session tracking]
```

#### **Customer Management** (30+ endpoints)
```
/api/ (root-level customer APIs)
├── customers/                      [Core customer data]
├── customer-advance-payments/      [Advance payment tracking]
├── customer-balance-transfers/     [Credit transfers]
├── customer-credit/                [Credit transactions]
├── customer-credit-advanced-configs/     [Advanced credit rules]
├── customer-credit-advanced-configs-approval/  [Credit approval workflow]
├── customer-credit-advanced-configs-manage/    [Credit management]
├── customer-credit-note-history/   [Credit notes]
├── customer-credit-settlement/     [Payment settlements]
├── customer-groups/                [Customer segments]
├── customer-ledger/                [Account ledger]
├── customer-loyalty-settings/      [Loyalty configuration]
├── customer-message-history/       [Communication logs]
├── customer-sms-credit/            [SMS balance]
├── customer-unsettled-orders/      [Pending settlements]
├── customer-whatsapp-credit/       [WhatsApp balance]
├── customers-sales-report/         [Customer sales analytics]
└── [more...]
```

#### **Dashboard & Analytics** (1 endpoint)
```
/api/dashboard/
└── stats/                          [Dashboard statistics]
```

#### **Other APIs**
```
/api/auth/                          [Authentication endpoints]
/api/regions/                       [Region management]
/api/stores/                        [Store locations]
/api/purchase-orders/               [Purchase requisitions]
/api/vendor-invoices/               [Vendor billing]
/api/vendors/                       [Supplier management]
/api/warehouses/                    [Warehouse locations]
/api/debug/                         [Debug utilities]
```

---

## 4. COMPONENT STRUCTURE

### Page Components in `src/app/`

#### **Authentication & Home**
- `login/` - Login page & credentials
- `page.js` - Home dashboard (BillingPro welcome)
- `layout.js` - Root app layout wrapper
- `RootClientWrapper.jsx` - Client-side context wrapper

#### **Catalog Module** (`/catalog`)
```
/catalog/
├── brand/
├── category/
├── charges/
├── department/
├── income-head/
├── manufacturer/
├── pricing/
├── product-groups/
├── product-saleability/
├── products/
├── promos/
├── service-department/
├── service-group/
├── services/
├── sub-category/
└── taxes/
```

#### **Inventory Module** (`/inventory`)
```
/inventory/
├── batches/
├── hub/
├── ops/
├── stockin/
├── stockout/
├── stockrequisition/
├── stocktransfer/
└── stockvalidation/
```

#### **Sales Order Module** (`/sales-order`)
- Sales order management pages

#### **Customer Module** (`/customer`)
```
/customer/
├── balance-transfer-tracker/
├── credit-advanced-configs/
├── credit-advanced-configs-approval/
├── credit-advanced-configs-list/
├── credit-advanced-configuration/
├── credit-note-history/
├── credit-settlement/
├── customer-advance-payment/
├── customer-credit-sale/
├── customer-groups/
├── customer-ledger/
├── customers-sales-report/
├── dashboard/
├── inactive-customers/
├── list-of-customers/
├── loyalty-settings/
├── message-history/
├── sms-credit/
├── unsettled-orders/
├── whatsapp-credit/
└── whatsapp-logs/
```

#### **Employee Module** (`/employee`)
- Employee and staff management pages

#### **Other Modules**
- `reports/` - Report generation pages
- `purchase/` - Purchase order & vendor pages
- `settings/` - Configuration pages
- `setup/` - Initial setup/onboarding
- `home/` - Home module pages

### Shared Components in `src/components/`

#### **Layout Components**
- `MainLayout.jsx` - Main application wrapper
- `Sidebar.jsx` - Left navigation sidebar
- `SubSidebar.jsx` - Secondary navigation
- `Topbar.jsx` - Header/top navigation
- `sidebarConfig.js` - Navigation configuration

#### **Page Components**
- `HomePage.jsx` - Dashboard home page
- `AuthScreen.jsx` - Authentication UI
- `ProtectedComponents.jsx` - Protected component wrapper
- `CatalogDashboard.jsx` - Catalog module dashboard
- `CatalogListPage.jsx` - Catalog listing page
- `CatalogDataPage.jsx` - Catalog detail page
- `SalesOrderListPage.jsx` - Sales order list
- `SalesOrderSectionPage.jsx` - Sales order details
- `ReportListPage.jsx` - Single report page
- `ReportsListPage.jsx` - All reports listing
- `CreditPurchasePage.jsx` - Credit purchase transactions
- `PromotionForm.jsx` - Promotion creation/editing
- `CustomerSearchModal.jsx` - Customer search UI
- `MessageLogsPage.jsx` - Communication logs

#### **Feature Components**
- `inventory/InventoryShell.jsx` - Inventory module wrapper

---

## 5. UTILITY & SERVICE MODULES

### Core Libraries (`src/lib/`)
- **db.js** - PostgreSQL connection pool (singleton pattern)
- **api-client.js** - Centralized API client with JWT auth
- **auth.js** - JWT authentication utilities
- **auth-enhanced.js** - Enhanced auth with role checking
- **api-protection.js** - API route middleware/protection
- **api-response.js** - Standardized API response format
- **request-context.js** - Request context management
- **rate-limiter.js** - API rate limiting
- **bulkSheet.js** - Bulk import/export utilities

### Business Services (`src/services/`)
- **billing.service.js** - Billing & sales operations
- **inventory.service.js** - Inventory management operations

### State Management (`src/store/`)
- **billing.store.js** - Billing state (Zustand or similar)
- (Additional store files exist but not fully explored)

### Custom Hooks (`src/hooks/`)
- **useCatalogList.js** - Catalog data fetching hook
- **useUser.js** - Current user context hook

### Middleware (`src/`)
- **middleware.js** - Next.js middleware for route protection

---

## 6. EXISTING MODULES & FEATURES

### ✅ Fully Implemented Modules

| Module | Status | Features |
|--------|--------|----------|
| **Authentication** | Complete | JWT-based login, role-based access |
| **Catalog** | Complete | Products, categories, taxes, charges, combos |
| **Inventory** | Complete | Stock in/out, transfers, validation, batches |
| **Sales Order** | Complete | POS, invoicing, order management |
| **Customer Management** | Complete | Master data, groups, loyalty, messaging |
| **Employee** | Complete | Staff, roles, permissions, departments |
| **Purchase** | Partial | Purchase orders, vendor invoicing |
| **Regions & Stores** | Complete | Multi-store, multi-region support |
| **Reports** | Partial | Customer sales reports |
| **Settings** | Partial | Configuration management |

### Advanced Features
- 🔐 **Multi-level Role-Based Access Control (RBAC)**
- 💳 **Customer Credit Management** (with advanced configs & approvals)
- 📱 **SMS & WhatsApp Integration** (credit tracking)
- 🎁 **Loyalty Points System** (registration points, loyalty tiers)
- 🎯 **Promotions & Vouchers** (with approval workflow)
- 📊 **Comprehensive Ledger System** (customer accounts)
- 🏪 **Multi-Store Operations** (store & warehouse assignments)
- 📦 **Inventory Batching** (lot/batch tracking)

---

## 7. KEY ARCHITECTURAL PATTERNS

### API Routes Pattern
```javascript
// All API routes follow this structure:
// /api/[module]/[entity]/route.js
// Support: GET, POST, PUT, DELETE operations
// Authentication: JWT middleware
// Response: Standardized ApiResponse format
```

### Database Access Pattern
- **Singleton Pool**: PostgreSQL connection pooling in `db.js`
- **Schema Functions**: Each entity has `ensure[Entity]Schema()` function
- **Type Safety**: SQL-based schemas with JSONB for flexible data
- **Indexes**: Optimized queries with strategic indexes

### Frontend Pattern
- **API Client**: Centralized `ApiClient` with auto-retry and error handling
- **Custom Hooks**: `useUser()`, `useCatalogList()` for data fetching
- **Layout Wrapper**: `MainLayout.jsx` as standard page wrapper
- **Protected Routes**: `ProtectedComponents.jsx` for auth checks

---

## 8. CONFIGURATION & ENVIRONMENT

### Environment Variables (Required)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=billingpro
DB_USER=postgres
DB_PASSWORD=
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### Build & Run
```bash
npm run dev      # Development server (Next.js)
npm run build    # Production build
npm start        # Production start
```

---

## 9. CONVENTIONS & BEST PRACTICES

### Naming Conventions
- **Schemas**: `<Entity>Schema.js` (e.g., `customersSchema.js`)
- **Components**: PascalCase (e.g., `HomePage.jsx`)
- **Hooks**: `use<Feature>` (e.g., `useCatalogList.js`)
- **API Routes**: `src/app/api/<module>/<entity>/route.js`
- **Page Routes**: `src/app/<module>/<entity>/page.jsx`

### Component Structure
- **Layout wrapper**: `MainLayout` for all authenticated pages
- **Sidebar config**: Centralized in `sidebarConfig.js`
- **Protected routes**: Middleware + `ProtectedComponents` wrapper

### Database
- Timestamps: `created_at`, `updated_at` (TIMESTAMPTZ)
- Soft deletes: Use `status` field
- Metadata: JSONB `meta` column for flexible data
- Indexing: On frequently queried fields (name, phone, email, etc.)

### API Response Format
Standardized across all endpoints (via `api-response.js`)

---

## 10. READY FOR MASTER DASHBOARD & POS MODULE

### Current Readiness
✅ All core infrastructure in place
✅ Database schemas established (29 tables)
✅ API routes pattern defined
✅ Authentication & authorization framework
✅ Component library established
✅ Services layer available

### Next Steps for Enhancement
1. **Master Dashboard**: Aggregate stats from all modules
2. **POS Module**: Leverage existing sales-order & inventory
3. **Analytics**: Build on customer & sales data
4. **Reporting**: Expand current reports module
5. **Integration**: Connect SMS/WhatsApp features

---

## 11. QUICK START REFERENCES

### Adding a New Feature
1. Create schema in `src/lib/<Feature>Schema.js`
2. Add API route at `src/app/api/<module>/<feature>/route.js`
3. Create component at `src/app/<module>/<feature>/page.jsx` or `src/components/<Feature>.jsx`
4. Add to sidebar config in `sidebarConfig.js`
5. Create hook if needed: `src/hooks/use<Feature>.js`

### Key Files to Understand
- `src/lib/db.js` - Database connection
- `src/lib/api-client.js` - Frontend API calls
- `src/middleware.js` - Route protection
- `src/components/MainLayout.jsx` - Layout structure
- `src/components/sidebarConfig.js` - Navigation

