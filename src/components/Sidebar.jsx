'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar({
  items = [],
  activeMenu,
  setActiveMenu,
  mobileOpen,
  onMobileClose,
  onMobileSubOpen,
}) {
  const pathname = usePathname();

  const handleClick = (e, item) => {
    if (item.subSidebar) {
      const isMobile =
        typeof window !== 'undefined' &&
        window.matchMedia('(max-width: 767px)').matches;

      if (isMobile) {
        e.preventDefault();
        onMobileSubOpen?.(item);
        return;
      }

      // allow navigation to the menu href (so dashboard pages open),
      // but also set active menu for subSidebar display
      setActiveMenu(item);
      onMobileClose?.();
    } else {
      setActiveMenu(null);
      onMobileClose?.();
    }
  };

  const NavItem = ({ item }) => {
    const isSubActive = activeMenu?.label === item.label;
    const isPageActive =
      pathname === item.href ||
      pathname.startsWith('/' + item.href.split('/')[1] + '/') ||
      pathname === '/' + item.href.split('/')[1];
    const isActive = isSubActive || isPageActive;

    return (
      <Link
        href={item.href}
        onClick={(e) => handleClick(e, item)}
        className="relative block group"
        title={item.label}
      >
        {/* Desktop */}
        <div className={`
          hidden md:flex h-12 w-12 items-center justify-center rounded-2xl
          cursor-pointer transition-all duration-200
          ${isActive ? 'bg-blue-600 text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)]' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-700'}
        `}>
          {isActive && <span className="absolute -left-2 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-600" />}
          <i className={`ti ${item.icon} text-[22px]`} />
          <span className="pointer-events-none absolute left-[58px] z-50 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 shadow-xl transition-all duration-150 group-hover:translate-x-1 group-hover:opacity-100">
            {item.label}
          </span>
        </div>

        {/* Mobile */}
        <div className={`
          md:hidden flex items-center gap-3 px-4 py-3
          cursor-pointer transition-all duration-150 border-b border-gray-100
          ${isActive ? 'bg-orange-50 border-l-[3px] border-l-orange-400' : 'hover:bg-gray-50 border-l-[3px] border-l-transparent'}
        `}>
          <i className={`ti ${item.icon} text-[22px] flex-shrink-0 ${isActive ? 'text-orange-500' : 'text-blue-900'}`} />
          <span className={`text-[14px] font-medium ${isActive ? 'text-orange-500' : 'text-gray-700'}`}>
            {item.label}
          </span>
          {item.subSidebar && (
            <i className={`ti ti-chevron-right text-[13px] ml-auto ${isActive ? 'text-orange-400' : 'text-gray-400'}`} />
          )}
        </div>
      </Link>
    );
  };

  return (
    <>
      {mobileOpen && (
        <div className="sidebar-overlay md:hidden" onClick={onMobileClose} />
      )}

      <div className={`
        sidebar-drawer fixed left-0 top-0 h-full w-[280px] bg-white z-50 shadow-2xl
        flex flex-col md:hidden
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-[16px] font-extrabold text-blue-700">BillingPro</p>
            <p className="text-[10px] text-gray-400">India's No.1 Business App</p>
          </div>
          <button onClick={onMobileClose} className="p-2 rounded-lg hover:bg-gray-100">
            <i className="ti ti-x text-gray-500 text-[18px]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {items.map((item) => (
            <NavItem key={item.label} item={item} />
          ))}
        </div>

        <div className="border-t border-gray-100 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-[11px] font-bold text-white">AD</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-800">Admin User</p>
              <p className="text-[11px] text-gray-400">Super Chain Admin</p>
            </div>
          </div>
        </div>
      </div>

      <aside className="hidden md:flex fixed left-0 top-[56px] h-[calc(100vh-56px)] w-[64px] flex-col items-center border-r border-slate-200/80 bg-white/95 z-40 shadow-[2px_0_18px_rgba(15,23,42,0.04)]">
        <div className="flex w-full justify-center border-b border-slate-100 px-2 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_10px_22px_rgba(37,99,235,0.2)]">
            <span className="text-[20px] font-black leading-none">B</span>
          </div>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto px-2 py-3">
          {items.map((item) => (
            <NavItem key={item.label} item={item} />
          ))}
        </div>
        <div className="w-full border-t border-slate-100 px-2 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <i className="ti ti-sparkles text-[20px]" />
          </div>
        </div>
      </aside>
    </>
  );
}
