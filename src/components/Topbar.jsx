'use client';

import { usePathname } from 'next/navigation';
import { menuItems } from './sidebarConfig';

function getPageTitle(pathname) {
  const flat = menuItems.flatMap((m) =>
    m.subSidebar
      ? m.subSidebar.groups.flatMap((g) => g.items).concat({ label: m.label, href: m.href })
      : [{ label: m.label, href: m.href }]
  );
  const match = flat.find((i) => pathname === i.href || pathname.startsWith(i.href + '/'));
  return match?.label ?? 'Home';
}

export default function Topbar({ onMenuOpen }) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="fixed top-0 left-0 right-0 h-[52px] bg-white border-b border-gray-200 z-50 flex items-center px-3 md:px-5">

      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuOpen}
        className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors mr-2 flex-shrink-0"
        aria-label="Open menu"
      >
        <i className="ti ti-menu-2 text-gray-700 text-[20px]" />
      </button>

      {/* Brand — hidden on mobile (shown in drawer instead) */}
      <div className="hidden md:block w-[218px] flex-shrink-0">
        <p className="text-[15px] font-extrabold text-blue-700 leading-tight">BillingPro</p>
        <p className="text-[9px] text-gray-400 leading-tight">India's No.1 Business App</p>
      </div>

      {/* Brand — mobile center */}
      <div className="md:hidden flex-1 flex justify-center">
        <p className="text-[15px] font-extrabold text-blue-700">BillingPro</p>
      </div>

      {/* Page title — desktop */}
      <div className="hidden md:block flex-1 px-4">
        <h2 className="text-[15px] font-semibold text-gray-800">{title}</h2>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        <button className="relative p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <i className="ti ti-bell text-gray-500 text-[20px]" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <button className="hidden sm:block p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <i className="ti ti-help-circle text-gray-500 text-[20px]" />
        </button>

        <div className="flex items-center gap-2 pl-2 md:pl-4 md:border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-bold text-white">AD</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-[12px] font-semibold text-gray-800 leading-tight">Admin User</p>
            <p className="text-[10px] text-gray-400 leading-tight">Super Chain Admin</p>
          </div>
          <i className="ti ti-chevron-down text-gray-400 text-[13px] hidden sm:block" />
        </div>
      </div>
    </header>
  );
}