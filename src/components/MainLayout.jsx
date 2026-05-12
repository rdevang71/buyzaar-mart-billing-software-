'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import SubSidebar from './SubSidebar';
import { menuItems } from './sidebarConfig';

export default function MainLayout({ children }) {
  const pathname = usePathname();
  const [activeMenu, setActiveMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-open subSidebar when on a matching route
  useEffect(() => {
    const matched = menuItems.find(
      (item) =>
        item.subSidebar &&
        (pathname === item.href || pathname.startsWith(item.href + '/'))
    );
    if (matched) {
      setActiveMenu(matched);
    } else {
      setActiveMenu((prev) => {
        if (prev && !pathname.startsWith(prev.href)) return null;
        return prev;
      });
    }
  }, [pathname]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const subOpen = activeMenu?.subSidebar != null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar onMenuOpen={() => setMobileOpen(true)} />

      <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Desktop SubSidebar panel */}
      {subOpen && (
        <div className="hidden md:block fixed left-[218px] top-[52px] h-[calc(100vh-52px)] z-30 shadow-md w-[200px]">
          <SubSidebar
            subSidebar={activeMenu.subSidebar}
            onClose={() => setActiveMenu(null)}
          />
        </div>
      )}

      {/* Mobile SubSidebar — full-screen overlay drawer */}
      {subOpen && mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-white flex flex-col">
          <SubSidebar
            subSidebar={activeMenu.subSidebar}
            onClose={() => {
              setActiveMenu(null);
              setMobileOpen(false);
            }}
          />
        </div>
      )}

      {/* Main content — margins shift based on screen + sidebar state */}
      <main
        className={`
          transition-all duration-300
          mt-[52px]
          md:ml-[218px]
          ${subOpen ? 'md:ml-[418px]' : 'md:ml-[218px]'}
          min-h-[calc(100vh-52px)]
          p-4 sm:p-5 md:p-7
        `}
      >
        {children}
      </main>
    </div>
  );
}