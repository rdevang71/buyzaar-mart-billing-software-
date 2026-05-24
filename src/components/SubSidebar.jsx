'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SubSidebar({ subSidebar, sectionHref, onBackToMain, onClose }) {
  const pathname = usePathname();
  const currentSectionHref = subSidebar.sectionHref || sectionHref;
  const groups = subSidebar.groups || [];
  const [openGroups, setOpenGroups] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef(null);
  const activeLinkRef = useRef(null);
  const storageKey = useMemo(
    () => `sub-sidebar-scroll:${subSidebar.title || currentSectionHref || 'default'}`,
    [currentSectionHref, subSidebar.title]
  );

  useEffect(() => {
    setOpenGroups(Object.fromEntries(groups.map((g) => [g.label, true])));
    setSearchQuery('');
  }, [subSidebar]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          `${group.label} ${item.label}`.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, searchQuery]);

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
      <div ref={scrollRef} className="no-scrollbar flex flex-col h-full overflow-y-auto overflow-x-hidden bg-[#edf3fa] border-r border-slate-200">
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
    <div ref={scrollRef} className="no-scrollbar flex flex-col h-full overflow-y-auto overflow-x-hidden bg-[#edf3fa] border-r border-slate-200">
      <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-[#edf3fa]/95 px-3 py-3 backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
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
          <i className={`ti ${subSidebar.titleIcon} text-blue-700 text-[16px]`} />
          <span className="text-[13px] font-black text-slate-900">{subSidebar.title}</span>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <i className="ti ti-x text-gray-400 text-[14px]" />
          </button>
        )}
        </div>
        <div className="relative">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-slate-400" />
          <input
            type="search"
            placeholder="Search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-9 text-[12px] outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">Ctrl K</span>
        </div>
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

      <div className="py-3 px-2 space-y-2">
        {filteredGroups.map((group) => {
          const isOpen = openGroups[group.label];
          return (
            <div key={group.label}>
              <button
                type="button"
                onClick={() => toggle(group.label)}
                className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white/80"
              >
                <i className={`ti ${isOpen ? 'ti-chevron-down' : 'ti-chevron-right'} text-amber-500 text-[11px]`} />
                <i className={`ti ${group.icon} text-blue-700 text-[16px]`} />
                <span className="text-[12.5px] font-black text-slate-900 text-left">{group.label}</span>
              </button>
              {isOpen && (
                <div className="ml-5 border-l border-slate-300 pl-3 mt-0.5 mb-2 space-y-0.5">
                  {group.items.map((item) => {
                    const active =
                      pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        ref={active ? activeLinkRef : null}
                        onClick={() => onClose?.()}
                        className={`relative block rounded-xl px-3 py-2 text-[12.5px] transition-all duration-200
                          ${active
                            ? 'text-blue-700 font-bold bg-white shadow-sm'
                            : 'text-slate-600 hover:text-blue-900 hover:bg-white/70'
                          }`}
                      >
                        {active && <span className="absolute -left-[13px] top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-blue-600" />}
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {filteredGroups.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-6 text-center text-[12px] font-medium text-slate-400">
            No menu items found
          </div>
        )}
      </div>
    </div>
  );
}
