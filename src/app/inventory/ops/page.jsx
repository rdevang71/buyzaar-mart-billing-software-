'use client';

import MainLayout from '@/components/MainLayout';

const tabs = [
  { label: 'Overview', icon: 'ti-layout-grid', active: true },
  { label: 'Stock In', icon: 'ti-inbox' },
  { label: 'Stock Out', icon: 'ti-logout-2' },
  { label: 'Transfers', icon: 'ti-arrows-exchange' },
  { label: 'Stock Audit', icon: 'ti-shield-check' },
  { label: 'Batches - Expiry', icon: 'ti-box' },
];

const stats = [
  { label: 'Stock on hand', note: 'Across all stores', value: '—' },
  { label: 'SKUs out of stock', note: 'Zero or missing stock', value: '10/10' },
  { label: 'Stockout risk (7d)', note: 'Forecasted', value: '—', status: 'warning' },
  { label: 'Expiring <30 days', note: 'In the next 30 days', value: '0 batches' },
];

const quickFilters = [
  'Slowest-moving 20 items',
  'Stock value by category',
  'Variance by cashier this month',
  'Items not sold in 60 days',
  'Average days of cover per category',
];

export default function InventoryOpsPage() {
  return (
    <MainLayout>
      <div className="flex items-center gap-2 text-[12px] text-gray-500 mb-4">
        <span className="text-blue-600">Home</span>
        <i className="ti ti-chevron-right text-[11px] text-gray-400" />
        <span className="font-semibold text-gray-900">Inventory</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[28px] font-semibold text-gray-900 leading-tight">Inventory</h1>
          <p className="text-[13px] text-gray-500 mt-1">2 stores · 10 products · Last sync a few seconds ago</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-blue-300 text-[13px] font-medium text-blue-600 hover:bg-blue-50 transition-colors">
            <i className="ti ti-upload text-[16px]" />
            Import stock
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-blue-300 text-[13px] font-medium text-blue-600 hover:bg-blue-50 transition-colors">
            <i className="ti ti-download text-[16px]" />
            Export
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-[13px] font-medium text-white hover:bg-gray-800 transition-colors">
            <i className="ti ti-plus text-[16px]" />
            Stock In
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-200 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            className={`flex items-center gap-2 pb-3 px-1 text-[13.5px] font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab.active
                ? 'text-gray-900 border-b-gray-900'
                : 'text-gray-500 border-b-transparent hover:text-gray-700'
            }`}
          >
            <i className={`ti ${tab.icon} text-[16px]`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <p className="text-[12px] font-medium text-gray-500">{stat.label}</p>
            <div className="mt-3 flex items-end gap-2">
              {stat.value === '—' ? (
                <div className="w-10 h-1 rounded-full bg-gray-300" />
              ) : (
                <span className="text-[28px] font-bold text-gray-900">{stat.value}</span>
              )}
              {stat.status === 'warning' && (
                <i className="ti ti-alert-triangle text-orange-500 text-[18px]" />
              )}
            </div>
            <p className={`text-[11.5px] mt-2 ${
              stat.status === 'warning' ? 'text-orange-600' : 'text-gray-400'
            }`}>
              {stat.note}
            </p>
          </div>
        ))}
      </div>

      {/* QB Intelligence Section */}
      <div className="bg-[#fff7ef] border border-orange-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full">
                QB INTELLIGENCE
              </span>
              <span className="text-[14px] font-semibold text-gray-900">Things to act on this week</span>
            </div>
            <p className="text-[12px] text-gray-600">Based on last 30 days</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3 bg-white rounded-xl p-4 border border-orange-100">
            <i className="ti ti-alert-circle text-orange-500 text-[18px] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-gray-900">AI insights not enabled for this chain</p>
              <p className="text-[12px] text-gray-500 mt-1">Contact your account manager to enable the Intelligence Reports add-on for your chain.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Stock Movements */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900">Recent stock movements</h3>
              <p className="text-[12px] text-gray-500 mt-0.5">Last 24 hours across all stores</p>
            </div>
            <a href="#" className="text-[12px] font-medium text-blue-600 hover:underline">
              View all <i className="ti ti-arrow-right text-[12px] inline ml-1" />
            </a>
          </div>
          <div className="flex items-center justify-center py-12">
            <p className="text-[13px] text-gray-400">No stock movements in the last 30 days.</p>
          </div>
        </div>

        {/* Stockout Forecast */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900">Stockout forecast</h3>
              <p className="text-[12px] text-gray-500 mt-0.5">AI-predicted days of cover - top 8 at-risk SKUs</p>
            </div>
            <span className="text-[11px] font-medium text-orange-500 bg-orange-50 px-2.5 py-1 rounded-full">
              <i className="ti ti-sparkles text-[12px] inline mr-1" />
              AI
            </span>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <i className="ti ti-alert-circle text-orange-500 text-[24px] mx-auto mb-2" />
              <p className="text-[13px] font-semibold text-gray-900">AI insights not enabled for this chain</p>
              <p className="text-[12px] text-gray-500 mt-1">Enable Intelligence Reports to see which SKUs will run out first, with recommended reorder quantities.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ask QB Section */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex items-center gap-2 mb-4">
          <i className="ti ti-sparkles text-orange-500 text-[18px]" />
          <h3 className="text-[14px] font-semibold text-gray-900">Ask QB about your stock</h3>
        </div>
        <p className="text-[12px] text-gray-500 mb-4">Natural-language questions — English or Hinglish</p>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 focus-within:border-blue-400 focus-within:bg-white">
            <i className="ti ti-search text-gray-400 text-[16px]" />
            <input
              type="text"
              placeholder="e.g. Which SKUs have the most shrinkage this quarter?"
              className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>
          <button className="px-4 py-3 rounded-lg bg-gray-900 text-white text-[13px] font-semibold hover:bg-gray-800 transition-colors flex-shrink-0">
            Ask
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickFilters.map((filter) => (
            <button
              key={filter}
              className="px-3 py-2 rounded-lg bg-gray-100 text-[12px] font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
