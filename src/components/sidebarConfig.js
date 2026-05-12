export const menuItems = [
  { label: 'Home',         icon: 'ti-home',           href: '/home',         subSidebar: null },
  { label: 'Catalog',      icon: 'ti-layout-grid',    href: '/catalog',      subSidebar: {
    title: 'Catalog Dashboard',
    titleIcon: 'ti-layout-dashboard',
    groups: [
      {
        label: 'Product Classification', icon: 'ti-shopping-bag',
        items: [
          { label: 'Category',           href: '/catalog/category' },
          { label: 'Sub Category',       href: '/catalog/sub-category' },
          { label: 'Manufacturer',       href: '/catalog/manufacturer' },
          { label: 'Brand',              href: '/catalog/brand' },
          { label: 'Income Head',        href: '/catalog/income-head' },
          { label: 'Service Group',      href: '/catalog/service-group' },
          { label: 'Department',         href: '/catalog/department' },
          { label: 'Service Department', href: '/catalog/service-department' },
        ],
      },
      {
        label: 'Product', icon: 'ti-building-store',
        items: [
          { label: 'Products',            href: '/catalog/products' },
          { label: 'Product Groups',      href: '/catalog/product-groups' },
          { label: 'Services',            href: '/catalog/services' },
          { label: 'Product Saleability', href: '/catalog/product-saleability' },
        ],
      },
      {
        label: 'Taxes & Charges', icon: 'ti-file-invoice',
        items: [
          { label: 'Taxes',   href: '/catalog/taxes' },
          { label: 'Charges', href: '/catalog/charges' },
        ],
      },
      {
        label: 'Pricing', icon: 'ti-tag',
        items: [
          { label: 'Assign Products To Store',       href: '/catalog/pricing/assign-products-store' },
          { label: 'Assign Products To Warehouse',   href: '/catalog/pricing/assign-products-warehouse' },
          { label: 'Assign Product Groups To Store', href: '/catalog/pricing/assign-groups-store' },
        ],
      },
      {
        label: 'Promotional Products', icon: 'ti-discount',
        items: [
          { label: 'Combos',             href: '/catalog/promos/combos' },
          { label: 'Memberships',        href: '/catalog/promos/memberships' },
          { label: 'Vouchers',           href: '/catalog/promos/vouchers' },
          { label: 'Promotions',         href: '/catalog/promos/promotions' },
          { label: 'Promotion Approval', href: '/catalog/promos/approval' },
        ],
      },
    ],
  }},
  { label: 'Inventory',    icon: 'ti-clipboard-list', href: '/inventory/hub', subSidebar: {
    title: 'Inventory Dashboard',
    titleIcon: 'ti-layout-dashboard',
    groups: [
      {
        label: 'Dashboard', icon: 'ti-layout-dashboard',
        items: [
          { label: 'Inventory Dashboard', href: '/inventory/ops' },
          { label: 'Overview',            href: '/inventory/hub' },
        ],
      },
      {
        label: 'Stock Operations', icon: 'ti-swap-horizontal',
        items: [
          { label: 'Stock In',         href: '/inventory/stockin' },
          { label: 'Stock Out',        href: '/inventory/stockout' },
          { label: 'Stock Transfer',   href: '/inventory/stocktransfer' },
          { label: 'Stock Validation', href: '/inventory/stockvalidation' },
        ],
      },
      {
        label: 'Requisitions & Batches', icon: 'ti-clipboard-list',
        items: [
          { label: 'Stock Requisition', href: '/inventory/stockrequisition' },
          { label: 'Batches',           href: '/inventory/batches' },
        ],
      },
    ],
  }},
  { label: 'Purchase',     icon: 'ti-shopping-cart',  href: '/purchase/vendors', subSidebar: {
    title: 'Purchase',
    titleIcon: 'ti-shopping-cart',
    groups: [
      {
        label: 'Vendors & Invoices', icon: 'ti-user-plus',
        items: [
          { label: 'Vendors',             href: '/purchase/vendors' },
          { label: 'Purchase Orders',     href: '/purchase/purchase-orders' },
          { label: 'Vendor Invoices',     href: '/purchase/vendor-invoices' },
          { label: 'Invoice Settlement',  href: '/purchase/invoice-settlement' },
        ],
      },
    ],
  }},

  /* ── Sales Order ── */
  { label: 'Sales Order',  icon: 'ti-receipt', href: '/sales-order/invoice-sales-order', subSidebar: {
    title: 'Sales Order',
    titleIcon: 'ti-receipt',
    groups: [
      {
        label: 'Sales Order', icon: 'ti-file-invoice',
        items: [
          { label: 'Invoice Sales Order',        href: '/sales-order/invoice-sales-order' },
          { label: 'Uninvoiced Sales Order',      href: '/sales-order/uninvoiced-sales-order' },
          { label: 'Bulk Sales Order',            href: '/sales-order/bulk-sales-order' },
          { label: 'Invoice Conversion Tracker', href: '/sales-order/invoice-conversion-tracker' },
          { label: 'Write Off',                   href: '/sales-order/write-off' },
          { label: 'Quotation Pending Approval',  href: '/sales-order/quotation-pending-approval' },
          { label: 'Auto Invoice',                href: '/sales-order/auto-invoice' },
        ],
      },
    ],
  }},

  { label: 'Customer',     icon: 'ti-users',           href: '/customer',     subSidebar: null },
  { label: 'Employee',     icon: 'ti-user-check',      href: '/employee',     subSidebar: null },
  { label: 'Reports',      icon: 'ti-chart-pie',       href: '/reports',      subSidebar: null },
  { label: 'Settings',     icon: 'ti-settings',        href: '/settings',     subSidebar: null },
  { label: 'eStore',       icon: 'ti-device-desktop',  href: '/estore',       subSidebar: null },
  { label: 'Khata',        icon: 'ti-book',            href: '/khata',        subSidebar: null },
  { label: 'Integrations', icon: 'ti-plug',            href: '/integrations', subSidebar: null },
];