'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SubSidebar({ subSidebar, sectionHref, onBackToMain, onClose }) {
  const pathname = usePathname();
  const currentSectionHref = subSidebar.sectionHref || sectionHref;
  const groups = subSidebar.groups || [];
  const [openGroups, setOpenGroups] = useState({});
  const scrollRef = useRef(null);
  const activeLinkRef = useRef(null);
  const storageKey = useMemo(
    () => `sub-sidebar-scroll:${subSidebar.title || currentSectionHref || 'default'}`,
    [currentSectionHref, subSidebar.title]
  );

  useEffect(() => {
    setOpenGroups(Object.fromEntries(groups.map((g) => [g.label, true])));
  }, [subSidebar]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;

    const saved = Number(sessionStorage.getItem(storageKey));
    if (Number.isFinite(saved) && saved > 0) {
      requestAnimationFrame(() => {
        node.scrollTop = saved;
      });
    } else if (activeLinkRef.current) {
      requestAnimationFrame(() => {
        activeLinkRef.current?.scrollIntoView({ block: 'nearest' });
      });
    }

    const saveScroll = () => {
      sessionStorage.setItem(storageKey, String(node.scrollTop));
    };
    node.addEventListener('scroll', saveScroll, { passive: true });
    return () => {
      saveScroll();
      node.removeEventListener('scroll', saveScroll);
    };
  }, [pathname, storageKey, openGroups]);

  /* ── Employee-style flat list ── */
  if (subSidebar.flatItems?.length) {
    const sectionActive =
      currentSectionHref &&
      (pathname === currentSectionHref ||
        pathname.startsWith(currentSectionHref + '/'));

    return (
      <div ref={scrollRef} className="flex flex-col h-full bg-white border-r border-gray-200 overflow-y-auto">
        {(onBackToMain || onClose) && (
          <div className="md:hidden flex items-center justify-between px-3 py-2.5 border-b border-gray-200 bg-white shrink-0">
            {onBackToMain ? (
              <button
                type="button"
                onClick={onBackToMain}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-blue-700 hover:bg-blue-50"
              >
                <i className="ti ti-arrow-left text-[16px]" />
                Sections
              </button>
            ) : (
              <span />
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100"
                aria-label="Close menu"
              >
                <i className="ti ti-x text-gray-500 text-[16px]" />
              </button>
            )}
          </div>
        )}

        {subSidebar.sectionTitle && (
          <div className="px-4 pt-5 pb-2">
            {currentSectionHref ? (
              <Link
                href={currentSectionHref}
                onClick={() => onClose?.()}
                className={`block text-[13px] font-semibold tracking-tight transition-colors ${
                  sectionActive
                    ? 'text-orange-500'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {subSidebar.sectionTitle}
              </Link>
            ) : (
              <p className="text-[13px] font-semibold text-gray-500 tracking-tight">
                {subSidebar.sectionTitle}
              </p>
            )}
          </div>
        )}

        <nav className="px-3 pb-6 pt-2 flex flex-col gap-0.5">
          {subSidebar.flatItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                ref={active ? activeLinkRef : null}
                onClick={() => onClose?.()}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-[13px] font-medium transition-colors ${
                  active
                    ? 'text-orange-500 bg-orange-50 font-semibold'
                    : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50'
                }`}
              >
                {item.icon ? (
                  <i
                    className={`ti ${item.icon} text-[18px] w-[22px] text-center flex-shrink-0 ${
                      active ? 'text-orange-500' : 'text-gray-500'
                    }`}
                  />
                ) : (
                  <span className="w-[22px] flex-shrink-0" aria-hidden />
                )}
                <span className="leading-snug">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  /* ── Grouped sidebar (Catalog, Sales Order, …) ── */
  const toggle = (label) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <div ref={scrollRef} className="flex flex-col h-full bg-[#f0f4fa] border-r border-gray-200 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          {onBackToMain && (
            <button
              type="button"
              onClick={onBackToMain}
              className="md:hidden -ml-2 rounded-lg p-1.5 text-blue-700 hover:bg-blue-50"
              aria-label="Back to sections"
            >
              <i className="ti ti-arrow-left text-[17px]" />
            </button>
          )}
          <i className={`ti ${subSidebar.titleIcon} text-blue-900 text-[16px]`} />
          <span className="text-[13px] font-bold text-blue-900">{subSidebar.title}</span>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <i className="ti ti-x text-gray-400 text-[14px]" />
          </button>
        )}
      </div>

      {currentSectionHref && (
        <div className="md:hidden border-b border-gray-200 bg-white px-3 py-2">
          <Link
            href={currentSectionHref}
            onClick={() => onClose?.()}
            className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors ${
              pathname === currentSectionHref || pathname.startsWith(currentSectionHref + '/')
                ? 'bg-orange-50 text-orange-500'
                : 'text-blue-700 hover:bg-blue-50'
            }`}
          >
            <i className="ti ti-layout-dashboard text-[16px]" />
            {subSidebar.title} home
          </Link>
        </div>
      )}

      <div className="py-2 px-2 space-y-0.5">
        {groups.map((group) => {
          const isOpen = openGroups[group.label];
          return (
            <div key={group.label}>
              <button
                type="button"
                onClick={() => toggle(group.label)}
                className="w-full flex items-center gap-2 px-2 py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <i className={`ti ${isOpen ? 'ti-chevron-down' : 'ti-chevron-right'} text-orange-400 text-[11px]`} />
                <i className={`ti ${group.icon} text-blue-800 text-[16px]`} />
                <span className="text-[12.5px] font-bold text-blue-900 text-left">{group.label}</span>
              </button>
              {isOpen && (
                <div className="ml-4 border-l-2 border-gray-300 pl-2 mt-0.5 mb-1.5 space-y-0.5">
                  {group.items.map((item) => {
                    const active =
                      pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        ref={active ? activeLinkRef : null}
                        onClick={() => onClose?.()}
                        className={`block px-2 py-2 rounded-lg text-[12.5px] transition-colors
                          ${active
                            ? 'text-orange-500 font-semibold bg-orange-50'
                            : 'text-gray-600 hover:text-blue-900 hover:bg-blue-50'
                          }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
