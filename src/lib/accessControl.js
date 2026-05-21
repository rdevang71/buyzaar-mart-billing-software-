const ROLE_HOME_PATHS = {
  super_admin: '/home/master-dashboard',
  admin: '/home',
  manager: '/home',
  user: '/sales/pos',
};

const MENU_ROLES = {
  Home: ['super_admin', 'admin', 'manager'],
  Sales: ['super_admin', 'admin', 'manager', 'user'],
  Catalog: ['super_admin', 'admin'],
  Inventory: ['super_admin', 'admin', 'manager'],
  Purchase: ['super_admin', 'admin', 'manager'],
  'Sales Order': ['super_admin', 'admin', 'manager'],
  Employee: ['super_admin', 'admin'],
  Customer: ['super_admin', 'admin', 'manager'],
  Settings: ['super_admin', 'admin'],
  Reports: ['super_admin', 'admin', 'manager'],
};

const SUB_ITEM_ROLES = {
  '/home/master-dashboard': ['super_admin'],
  '/': ['admin', 'manager'],
  '/sales/pos': ['super_admin', 'admin', 'manager', 'user'],
  '/sales/returns': ['super_admin', 'admin', 'manager'],
  '/employee/roles': ['super_admin'],
  '/employee/permissions': ['super_admin'],
  '/employee/staffdepartments': ['super_admin', 'admin'],
  '/employee/staff': ['super_admin', 'admin'],
  '/employee/user-counter-session': ['super_admin', 'admin', 'manager'],
  '/settings/stores': ['super_admin'],
  '/settings/warehouses': ['super_admin'],
  '/settings/regions': ['super_admin'],
  '/settings/payment/chain-payment-settings': ['super_admin'],
  '/settings/billing/chain-attributes': ['super_admin'],
  '/settings/business-info': ['super_admin'],
  '/settings/app-settings': ['super_admin'],
  '/settings/store-payment-modes': ['super_admin', 'admin'],
};

const ROUTE_RULES = [
  { prefix: '/login', roles: ['guest', 'super_admin', 'admin', 'manager', 'user'] },
  { prefix: '/home/master-dashboard', roles: ['super_admin'] },
  { prefix: '/sales/pos', roles: ['super_admin', 'admin', 'manager', 'user'] },
  { prefix: '/sales/returns', roles: ['super_admin', 'admin', 'manager'] },
  { prefix: '/sales', roles: ['super_admin', 'admin', 'manager', 'user'] },
  { prefix: '/employee/roles', roles: ['super_admin'] },
  { prefix: '/employee/permissions', roles: ['super_admin'] },
  { prefix: '/employee/staffdepartments', roles: ['super_admin', 'admin'] },
  { prefix: '/employee/staff', roles: ['super_admin', 'admin'] },
  { prefix: '/employee/user-counter-session', roles: ['super_admin', 'admin', 'manager'] },
  { prefix: '/employee', roles: ['super_admin', 'admin'] },
  { prefix: '/settings/stores', roles: ['super_admin'] },
  { prefix: '/settings/warehouses', roles: ['super_admin'] },
  { prefix: '/settings/regions', roles: ['super_admin'] },
  { prefix: '/settings/payment/chain-payment-settings', roles: ['super_admin'] },
  { prefix: '/settings/billing/chain-attributes', roles: ['super_admin'] },
  { prefix: '/settings/business-info', roles: ['super_admin'] },
  { prefix: '/settings/app-settings', roles: ['super_admin'] },
  { prefix: '/settings', roles: ['super_admin', 'admin'] },
  { prefix: '/catalog', roles: ['super_admin', 'admin'] },
  { prefix: '/inventory', roles: ['super_admin', 'admin', 'manager'] },
  { prefix: '/purchase', roles: ['super_admin', 'admin', 'manager'] },
  { prefix: '/sales-order', roles: ['super_admin', 'admin', 'manager'] },
  { prefix: '/customer', roles: ['super_admin', 'admin', 'manager'] },
  { prefix: '/reports', roles: ['super_admin', 'admin', 'manager'] },
  { prefix: '/home', roles: ['admin', 'manager'] },
  { prefix: '/', roles: ['admin', 'manager'] },
];

function normalizeRole(role) {
  return role || 'guest';
}

function roleAllowed(role, roles = []) {
  return roles.includes(normalizeRole(role));
}

function pathMatches(pathname, href) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getDefaultRouteForUser(user) {
  return ROLE_HOME_PATHS[normalizeRole(user?.role)] || '/login';
}

export function canAccessPath(user, pathname) {
  const role = normalizeRole(user?.role);
  const sortedRules = [...ROUTE_RULES].sort((a, b) => b.prefix.length - a.prefix.length);
  const rule = sortedRules.find((entry) => pathMatches(pathname, entry.prefix));
  return rule ? roleAllowed(role, rule.roles) : role !== 'guest';
}

export function filterMenuItemsForUser(menuItems, user) {
  const role = normalizeRole(user?.role);

  return menuItems
    .filter((item) => roleAllowed(role, MENU_ROLES[item.label] || []))
    .map((item) => {
      if (!item.subSidebar?.groups) return item;

      const groups = item.subSidebar.groups
        .map((group) => ({
          ...group,
          items: group.items.filter((subItem) =>
            roleAllowed(role, SUB_ITEM_ROLES[subItem.href] || MENU_ROLES[item.label] || [])
          ),
        }))
        .filter((group) => group.items.length > 0);

      return {
        ...item,
        subSidebar: {
          ...item.subSidebar,
          groups,
        },
      };
    })
    .filter((item) => !item.subSidebar?.groups || item.subSidebar.groups.length > 0);
}

export function getFirstAccessibleHref(menuItems, user) {
  const filtered = filterMenuItemsForUser(menuItems, user);
  const first = filtered[0];
  const firstSubItem = first?.subSidebar?.groups?.[0]?.items?.[0];
  return firstSubItem?.href || first?.href || getDefaultRouteForUser(user);
}

export function getPageTitleForMenu(menuItems, pathname) {
  for (const item of menuItems) {
    if (pathname === item.href || pathname.startsWith(item.href + '/')) {
      if (item.subSidebar?.groups) {
        for (const group of item.subSidebar.groups) {
          const match = group.items.find(
            (subItem) => pathname === subItem.href || pathname.startsWith(subItem.href + '/')
          );
          if (match?.label) return match.label;
        }
      }
      return item.label;
    }
  }

  return 'Home';
}
