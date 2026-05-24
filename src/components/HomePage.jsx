'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { fetchAuthEndpoint } from '@/lib/auth-endpoints';

const checklistItems = [
  { label: 'Add your first products',  desc: 'Use AI import or add manually', href: '/catalog/products' },
  { label: 'Confirm payment modes',    desc: 'UPI, card, cash',               href: '/settings/payment/chain-payment-settings' },
  { label: 'Add your first cashier',   desc: 'Optional — you can bill solo too', href: '/employee' },
];

export default function HomePage() {
  const router = useRouter();
  const { user } = useUser();
  const [stats, setStats] = useState({
    products: 0,
    customers: 0,
    lowStock: 0,
    firstSale: null,
    store: null,
    sales: {
      totalSales: 0,
      todaySales: 0,
      totalRevenue: 0,
      todayRevenue: 0,
      weekRevenue: 0,
      avgOrderValue: 0,
      recentOrders: [],
      topProducts: [],
      dailyData: [],
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      router.replace('/home/master-dashboard');
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await fetchAuthEndpoint('/api/dashboard/stats');
        const json = await res.json();
        if (res.ok && json.success) {
          setStats(json.data);
        }
      } catch (err) {
        console.error('[HomePage] Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [router, user?.role]);

  const dashboardStats = [
    {
      icon: 'ti-tag',
      label: 'Catalog',
      value: String(stats.products),
      unit: 'products',
      sub: 'Manage catalog',
      href: '/catalog/products',
      subBlue: true,
    },
    {
      icon: 'ti-users',
      label: 'Customers',
      value: String(stats.customers),
      unit: '',
      sub: 'Add at bill time',
      href: '/customer',
      subBlue: false,
    },
    {
      icon: 'ti-building-store',
      label: 'Store status',
      value: 'Open',
      unit: '',
      sub: 'Payment setup',
      href: '/settings',
      subBlue: false,
      green: true,
    },
    {
      icon: 'ti-alert-circle',
      label: 'Low stock',
      value: String(stats.lowStock),
      unit: 'items',
      sub: 'Adjust inventory',
      href: '/inventory',
      subBlue: true,
    },
  ];

  const hasOrders = stats.sales?.recentOrders?.length > 0;

  // Simple bar chart using divs (no extra library needed)
  const maxRevenue = Math.max(...(stats.sales?.dailyData?.map(d => d.revenue) || [1]), 1);

  return (
    <MainLayout>
      {/* Hero */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[20px] md:text-[22px] font-bold text-gray-900">
            You're ready to sell, {user?.name?.split(' ')[0] || 'Admin'}!
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Your store is set up. Add a few products and open the POS to make your first sale.
          </p>
        </div>
        <Link
          href="/sales/pos"
          className="self-start flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-[13px] font-semibold text-white hover:bg-blue-700 transition-colors flex-shrink-0"
        >
          <i className="ti ti-bolt text-[15px]" />
          Open POS
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
        {dashboardStats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white rounded-xl border border-gray-200 px-4 py-3 md:px-5 md:py-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-center gap-1.5 text-gray-500 mb-2">
              <i className={`ti ${s.icon} text-[15px]`} />
              <span className="text-[11.5px] md:text-[12px] font-medium">{s.label}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              {s.green ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block mb-0.5" />
                  <p className="text-[18px] md:text-[20px] font-bold text-green-600 leading-none">{s.value}</p>
                </>
              ) : (
                <p className="text-[22px] md:text-[28px] font-bold text-gray-900 leading-none">
                  {loading ? '-' : s.value}
                </p>
              )}
              {s.unit && <span className="text-[12px] text-gray-400">{s.unit}</span>}
            </div>
            <p className={`text-[11.5px] md:text-[12px] mt-2 ${s.subBlue ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              {s.sub}
            </p>
          </Link>
        ))}
      </div>

      {/* Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-4">

        {/* Sales Analytics Panel */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13.5px] md:text-[14px] font-semibold text-gray-800">
              Sales Analytics
            </p>
            <Link
              href="/sales/pos"
              className="text-[12.5px] md:text-[13px] text-blue-600 font-medium hover:underline flex items-center gap-1"
            >
              Open billing <i className="ti ti-arrow-right text-[12px]" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* KPI Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                  {
                    label: "Today's Revenue",
                    value: `₹${(stats.sales?.todayRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                    sub: `${stats.sales?.todaySales || 0} orders`,
                    color: 'text-green-600',
                    bg: 'bg-green-50',
                    icon: 'ti-trending-up',
                  },
                  {
                    label: 'Total Revenue',
                    value: `₹${(stats.sales?.totalRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                    sub: `${stats.sales?.totalSales || 0} orders`,
                    color: 'text-blue-600',
                    bg: 'bg-blue-50',
                    icon: 'ti-cash',
                  },
                  {
                    label: 'This Week',
                    value: `₹${(stats.sales?.weekRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                    sub: 'Last 7 days',
                    color: 'text-purple-600',
                    bg: 'bg-purple-50',
                    icon: 'ti-calendar-week',
                  },
                  {
                    label: 'Avg Order',
                    value: `₹${(stats.sales?.avgOrderValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                    sub: 'Per transaction',
                    color: 'text-orange-600',
                    bg: 'bg-orange-50',
                    icon: 'ti-receipt',
                  },
                ].map((kpi) => (
                  <div key={kpi.label} className={`${kpi.bg} rounded-lg p-3`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <i className={`ti ${kpi.icon} text-[13px] ${kpi.color}`} />
                      <span className="text-[10.5px] text-gray-500 font-medium">{kpi.label}</span>
                    </div>
                    <p className={`text-[16px] md:text-[18px] font-bold ${kpi.color} leading-none`}>{kpi.value}</p>
                    <p className="text-[10.5px] text-gray-400 mt-1">{kpi.sub}</p>
                  </div>
                ))}
              </div>

              {/* Bar Chart — last 7 days */}
              {stats.sales?.dailyData?.length > 0 ? (
                <div className="mb-5">
                  <p className="text-[11.5px] font-semibold text-gray-500 mb-3">Revenue — Last 7 Days</p>
                  <div className="flex items-end gap-2 h-[80px]">
                    {stats.sales.dailyData.map((day, i) => {
                      const heightPct = Math.max((day.revenue / maxRevenue) * 100, 4);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[9px] text-gray-400">
                            {day.revenue > 0 ? `₹${Math.round(day.revenue / 1000)}k` : ''}
                          </span>
                          <div
                            className="w-full rounded-t-md bg-blue-500 hover:bg-blue-600 transition-colors"
                            style={{ height: `${heightPct}%` }}
                            title={`₹${day.revenue}`}
                          />
                          <span className="text-[9px] text-gray-400">{day.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mb-5 flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
                  <i className="ti ti-chart-bar text-[32px] text-gray-200 mb-2" />
                  <p className="text-[12px] text-gray-400">Chart populates after your first sale</p>
                </div>
              )}

              {/* Recent Transactions */}
              {hasOrders ? (
                <div>
                  <p className="text-[11.5px] font-semibold text-gray-500 mb-2">Recent Transactions</p>
                  <div className="space-y-2">
                    {stats.sales.recentOrders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <i className="ti ti-receipt text-[13px] text-blue-600" />
                          </div>
                          <div>
                            <p className="text-[12px] font-semibold text-gray-800">
                              {order.invoice_id || `Order #${order.id}`}
                            </p>
                            <p className="text-[10.5px] text-gray-400">
                              {new Date(order.date).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[13px] font-bold text-gray-900">
                            ₹{parseFloat(order.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </p>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            order.status === 'Completed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {order.status || 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[11.5px] text-gray-400 text-center pt-2">
                  No transactions yet — bill your first sale to see them here.
                </p>
              )}

              {/* Top Products */}
              {stats.sales?.topProducts?.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11.5px] font-semibold text-gray-500 mb-2">Top Selling Products</p>
                  <div className="space-y-2">
                    {stats.sales.topProducts.slice(0, 3).map((product, i) => {
                      const maxQty = stats.sales.topProducts[0]?.qty || 1;
                      return (
                        <div key={product.id || i} className="flex items-center gap-3">
                          <span className="text-[11px] text-gray-400 w-4">{i + 1}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[12px] font-medium text-gray-700">{product.name}</span>
                              <span className="text-[11px] text-gray-500">{product.qty} sold</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div
                                className="bg-blue-500 h-1.5 rounded-full"
                                style={{ width: `${(product.qty / maxQty) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Checklist */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
          <p className="text-[13.5px] md:text-[14px] font-bold text-gray-800 mb-0.5">Checklist before you open</p>
          <p className="text-[11.5px] text-gray-400 mb-5">Set these once and forget</p>
          <div className="space-y-4">
            {checklistItems.map((item, idx) => {
              const isCompleted =
                (idx === 0 && stats.products > 0) ||
                (idx === 1 && stats.store) ||
                false;
              return (
                <div key={item.label} className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-[2px] flex items-center justify-center flex-shrink-0 mt-0.5 ${isCompleted ? 'bg-green-100 border-green-400' : 'border-orange-400'}`}>
                      {isCompleted ? (
                        <i className="ti ti-check text-[12px] text-green-600" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-orange-400" />
                      )}
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
              );
            })}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
