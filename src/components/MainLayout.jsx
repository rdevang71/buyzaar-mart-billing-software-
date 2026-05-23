'use client';

import { useMemo, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import SubSidebar from './SubSidebar';
import { menuItems } from './sidebarConfig';
import { useUser } from '@/hooks/useUser';
import { canAccessPath, filterMenuItemsForUser, getFirstAccessibleHref } from '@/lib/accessControl';

export default function MainLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useUser();
  const [activeMenu, setActiveMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState('main');
  const accessibleMenuItems = useMemo(() => filterMenuItemsForUser(menuItems, user), [user]);
  const accessAllowed = !loading && user && canAccessPath(user, pathname);
  const hasAccessibleMenu = accessibleMenuItems.length > 0;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!canAccessPath(user, pathname)) {
      const fallbackRoute = getFirstAccessibleHref(menuItems, user);
      if (fallbackRoute && fallbackRoute !== pathname) {
        router.replace(fallbackRoute);
      }
    }
  }, [loading, pathname, router, user]);

  // Auto-open subSidebar when on a matching route
  useEffect(() => {
    // Extract base path from current pathname (e.g., 'purchase' from '/purchase/purchase-orders')
    const pathBase = pathname.split('/')[1];
    
    // Find matching menu item by comparing base paths
    const matched = accessibleMenuItems.find(
      (item) =>
        item.subSidebar &&
        item.href.split('/')[1] === pathBase // Compare base paths
    );
    
    if (matched) {
      setActiveMenu(matched);
    } else {
      setActiveMenu(null);
    }
  }, [pathname, accessibleMenuItems]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
    setMobilePanel('main');
  }, [pathname]);

  const subOpen = activeMenu?.subSidebar != null;
  const content = accessAllowed ? children : !loading && user && !hasAccessibleMenu ? (
    <div className="flex min-h-[50vh] items-center justify-center text-sm font-medium text-gray-500">
      You do not have access to any sections.
    </div>
  ) : (
    <div className="flex min-h-[50vh] items-center justify-center text-sm font-medium text-gray-500">
      Loading your workspace...
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar
        onMenuOpen={() => {
          setMobilePanel('main');
          setMobileOpen(true);
        }}
      />

      {hasAccessibleMenu && (
        <Sidebar
          items={accessibleMenuItems}
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          mobileOpen={mobileOpen}
          onMobileSubOpen={(item) => {
            setActiveMenu(item);
            setMobilePanel('sub');
            setMobileOpen(true);
          }}
          onMobileClose={() => {
            setMobileOpen(false);
            setMobilePanel('main');
          }}
        />
      )}

      {/* Desktop SubSidebar panel */}
      {hasAccessibleMenu && subOpen && (
        <div className="hidden md:block fixed left-[218px] top-[52px] h-[calc(100vh-52px)] z-30 shadow-md w-[200px]">
          <SubSidebar
            subSidebar={activeMenu.subSidebar}
            onClose={null}
          />
        </div>
      )}

      {/* Mobile SubSidebar — full-screen overlay drawer */}
      {hasAccessibleMenu && subOpen && mobileOpen && mobilePanel === 'sub' && (
        <div className="md:hidden fixed inset-0 z-[60] bg-white flex flex-col">
          <SubSidebar
            subSidebar={activeMenu.subSidebar}
            sectionHref={activeMenu.href}
            onBackToMain={() => setMobilePanel('main')}
            onClose={() => {
              setMobileOpen(false);
              setMobilePanel('main');
            }}
          />
        </div>
      )}

      {/* Main content — margins shift based on screen + sidebar state */}
      <main
        className={`
          transition-all duration-300
          mt-[52px]
          ${hasAccessibleMenu ? 'md:ml-[218px]' : 'md:ml-0'}
          ${hasAccessibleMenu && subOpen ? 'md:ml-[418px]' : ''}
          min-h-[calc(100vh-52px)]
          p-3 sm:p-5 md:p-7
          max-w-full overflow-x-hidden
        `}
      >
        {content}
      </main>
    </div>
  );
}
