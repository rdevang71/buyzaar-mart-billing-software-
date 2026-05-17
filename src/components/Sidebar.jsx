'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { menuItems } from './sidebarConfig';

export default function Sidebar({ activeMenu, setActiveMenu, mobileOpen, onMobileClose }) {
  const pathname = usePathname();

  const handleClick = (e, item) => {
    if (item.subSidebar) {
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
        className="relative block"
      >
        {/* Desktop */}
        <div className={`
          hidden md:flex flex-col items-center justify-center gap-1.5 py-4 px-2
          cursor-pointer transition-all duration-150 border-b border-r border-gray-100
          ${isActive ? 'bg-orange-50' : 'hover:bg-gray-50'}
        `}>
          {isActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-orange-400 rounded-r" />}
          <i className={`ti ${item.icon} text-[24px] ${isActive ? 'text-orange-500' : 'text-blue-900'}`} />
          <span className={`text-[10.5px] font-medium text-center leading-tight ${isActive ? 'text-orange-500' : 'text-gray-600'}`}>
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
          {menuItems.map((item) => (
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

      <aside className="hidden md:block fixed left-0 top-[52px] h-[calc(100vh-52px)] w-[218px] bg-white border-r border-gray-200 z-40 overflow-y-auto">
        <div className="grid grid-cols-2">
          {menuItems.map((item) => (
            <NavItem key={item.label} item={item} />
          ))}
        </div>
      </aside>
    </>
  );
}