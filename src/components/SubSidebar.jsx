'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SubSidebar({ subSidebar, onClose }) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState(
    () => Object.fromEntries(subSidebar.groups.map((g) => [g.label, true]))
  );

  const toggle = (label) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <div className="flex flex-col h-full bg-[#f0f4fa] border-r border-gray-200 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <i className={`ti ${subSidebar.titleIcon} text-blue-900 text-[16px]`} />
          <span className="text-[13px] font-bold text-blue-900">{subSidebar.title}</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
          <i className="ti ti-x text-gray-400 text-[14px]" />
        </button>
      </div>

      {/* Groups */}
      <div className="py-2 px-2 space-y-0.5">
        {subSidebar.groups.map((group) => {
          const isOpen = openGroups[group.label];
          return (
            <div key={group.label}>
              <button
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
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
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