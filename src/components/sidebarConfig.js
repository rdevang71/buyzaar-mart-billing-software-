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
  { label: 'Inventory',    icon: 'ti-clipboard-list', href: '/inventory',    subSidebar: null },
  { label: 'Purchase',     icon: 'ti-shopping-cart',  href: '/purchase',     subSidebar: null },
  { label: 'Sales Order',  icon: 'ti-receipt',        href: '/sales-order',  subSidebar: null },
  { label: 'Customer',     icon: 'ti-users',           href: '/customer',     subSidebar: null },
  { label: 'Employee',     icon: 'ti-user-check',     href: '/employee',     subSidebar: null },
  { label: 'Reports',      icon: 'ti-chart-pie',      href: '/reports',      subSidebar: null },
  { label: 'Settings',     icon: 'ti-settings',       href: '/settings',     subSidebar: null },
  { label: 'eStore',       icon: 'ti-device-desktop', href: '/estore',       subSidebar: null },
  { label: 'Khata',        icon: 'ti-book',           href: '/khata',        subSidebar: null },
  { label: 'Integrations', icon: 'ti-plug',           href: '/integrations', subSidebar: null },
];