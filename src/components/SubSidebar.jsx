'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SubSidebar({ subSidebar, onClose }) {
  const pathname = usePathname();

  /* ── Employee-style flat list (section title + optional icons per row) ── */
  if (subSidebar.flatItems?.length) {
    const sectionActive =
      subSidebar.sectionHref &&
      (pathname === subSidebar.sectionHref ||
        pathname.startsWith(subSidebar.sectionHref + '/'));

    return (
      <div className="flex flex-col h-full bg-[#eef3f8] border-r border-gray-200/90 overflow-y-auto">
        {onClose && (
          <div className="md:hidden flex items-center justify-end px-3 py-2.5 border-b border-gray-200/80 bg-white/90 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100"
              aria-label="Close menu"
            >
              <i className="ti ti-x text-gray-500 text-[16px]" />
            </button>
          </div>
        )}

        <div className="px-4 pt-5 pb-2">
          {subSidebar.sectionHref ? (
            <Link
              href={subSidebar.sectionHref}
              onClick={() => onClose?.()}
              className={`block text-[13px] font-semibold tracking-tight transition-colors ${
                sectionActive
                  ? 'text-orange-500'
                  : 'text-[#6b8cce] hover:text-blue-800'
              }`}
            >
              {subSidebar.sectionTitle}
            </Link>
          ) : (
            <p className="text-[13px] font-semibold text-[#6b8cce] tracking-tight">
              {subSidebar.sectionTitle}
            </p>
          )}
        </div>

        <nav className="px-3 pb-6 flex flex-col">
          {subSidebar.flatItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose?.()}
                className={`flex items-center gap-3 px-2 py-3.5 rounded-lg text-[13px] font-semibold transition-colors ${
                  active
                    ? 'text-orange-500 bg-orange-50/80'
                    : 'text-blue-950 hover:bg-white/60'
                }`}
              >
                {item.icon ? (
                  <i
                    className={`ti ${item.icon} text-[18px] w-[22px] text-center flex-shrink-0 ${
                      active ? 'text-orange-500' : 'text-blue-900'
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

  /* ── Grouped sidebar (Catalog, Inventory, …) ── */
  const [openGroups, setOpenGroups] = useState(
    () => Object.fromEntries(subSidebar.groups.map((g) => [g.label, true]))
  );

  const toggle = (label) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <div className="flex flex-col h-full bg-[#f0f4fa] border-r border-gray-200 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <i className={`ti ${subSidebar.titleIcon} text-blue-900 text-[16px]`} />
          <span className="text-[13px] font-bold text-blue-900">{subSidebar.title}</span>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <i className="ti ti-x text-gray-400 text-[14px]" />
          </button>
        )}
      </div>

      <div className="py-2 px-2 space-y-0.5">
        {subSidebar.groups.map((group) => {
          const isOpen = openGroups[group.label];
          return (
            <div key={group.label}>
              <button
                type="button"
                onClick={() => toggle(group.label)}
                className="w-full flex items-center gap-2 px-2 py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <i
                  className={`ti ${isOpen ? 'ti-chevron-down' : 'ti-chevron-right'} text-orange-400 text-[11px]`}
                />
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
                        className={`block px-2 py-2 rounded-lg text-[12.5px] transition-colors
                          ${active ? 'text-orange-500 font-semibold bg-orange-50' : 'text-gray-600 hover:text-blue-900 hover:bg-blue-50'}`}
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
