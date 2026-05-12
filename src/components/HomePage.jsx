'use client';

import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

const checklistItems = [
  { label: 'Add your first products',  desc: 'Use AI import or add manually', href: '/catalog/products' },
  { label: 'Confirm payment modes',    desc: 'UPI, card, cash',               href: '/settings' },
  { label: 'Add your first cashier',   desc: 'Optional — you can bill solo too', href: '/employee' },
];

const stats = [
  {
    icon: 'ti-tag',
    label: 'Catalog',
    value: '0',
    unit: 'products',
    sub: 'Manage catalog',
    subBlue: true,
  },
  {
    icon: 'ti-users',
    label: 'Customers',
    value: '0',
    unit: '',
    sub: 'Add at bill time',
    subBlue: false,
  },
  {
    icon: 'ti-building-store',
    label: 'Store status',
    value: 'Open',
    unit: '',
    sub: 'Payment setup',
    subBlue: false,
    green: true,
  },
  {
    icon: 'ti-star',
    label: 'First sale',
    value: 'Pending',
    unit: '',
    sub: 'Bill any item from POS',
    subBlue: false,
  },
];

export default function HomePage() {
  return (
    <MainLayout>
      {/* Hero */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[20px] md:text-[22px] font-bold text-gray-900">
            You're ready to sell, Admin!
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Your store is set up. Add a few products and open the POS to make your first sale.
          </p>
        </div>
        <button className="self-start flex items-center gap-2 px-4 py-2 border border-blue-300 rounded-lg text-[13px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0">
          <i className="ti ti-bolt text-[15px]" />
          Open POS
        </button>
      </div>

      {/* Stats — 2-col on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3 md:px-5 md:py-4">
            <div className="flex items-center gap-1.5 text-gray-500 mb-2">
              <i className={`ti ${s.icon} text-[15px]`} />
              <span className="text-[11.5px] md:text-[12px] font-medium">{s.label}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              {s.green
                ? <>
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block mb-0.5" />
                    <p className="text-[18px] md:text-[20px] font-bold text-green-600 leading-none">{s.value}</p>
                  </>
                : <p className="text-[22px] md:text-[28px] font-bold text-gray-900 leading-none">{s.value}</p>
              }
              {s.unit && <span className="text-[12px] text-gray-400">{s.unit}</span>}
            </div>
            <p className={`text-[11.5px] md:text-[12px] mt-2 ${s.subBlue ? 'text-blue-600 cursor-pointer hover:underline font-medium' : 'text-gray-400'}`}>
              {s.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Bottom — stack on mobile, side-by-side on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-4">

        {/* Sales chart empty state */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[13.5px] md:text-[14px] font-semibold text-gray-800">Your sales will show here</p>
            <Link href="/sales-order" className="text-[12.5px] md:text-[13px] text-blue-600 font-medium hover:underline flex items-center gap-1">
              Open billing <i className="ti ti-arrow-right text-[12px]" />
            </Link>
          </div>
          <p className="text-[11.5px] text-gray-400 mb-6">Live once you create your first bill</p>
          <div className="flex flex-col items-center justify-center py-10 md:py-14 border-2 border-dashed border-gray-100 rounded-xl">
            <i className="ti ti-chart-bar text-[38px] text-gray-200 mb-3" />
            <p className="text-[13px] font-semibold text-gray-400">No data yet</p>
            <p className="text-[11.5px] text-gray-400 text-center mt-1 max-w-[220px]">
              Bill your first sale and the chart will populate within seconds.
            </p>
          </div>
        </div>

        {/* Checklist */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
          <p className="text-[13.5px] md:text-[14px] font-bold text-gray-800 mb-0.5">Checklist before you open</p>
          <p className="text-[11.5px] text-gray-400 mb-5">Set these once and forget</p>
          <div className="space-y-4">
            {checklistItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-[2px] border-orange-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-orange-400" />
                  </div>
                  <div>
                    <p className="text-[12.5px] md:text-[13px] font-semibold text-gray-800">{item.label}</p>
                    <p className="text-[11px] text-gray-400">{item.desc}</p>
                  </div>
                </div>
                <Link
                  href={item.href}
                  className="text-[12px] font-semibold text-blue-600 hover:underline flex items-center gap-1 flex-shrink-0"
                >
                  Open <i className="ti ti-arrow-right text-[12px]" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}