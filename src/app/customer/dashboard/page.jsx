'use client';

import MainLayout from '@/components/MainLayout';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const newCustomersData = [
  { time: '12/05' }, { time: '4hrs' }, { time: '8hrs' },
  { time: '12hrs' }, { time: '16hrs' }, { time: '20hrs' }, { time: '13/05', value: 0 },
];

const activeCustomersData = [
  { time: '12/05', value: 0 }, { time: '4hrs', value: 0 }, { time: '8hrs', value: 0 },
  { time: '12hrs', value: 0 }, { time: '16hrs', value: 0 }, { time: '20hrs', value: 0 }, { time: '13/05', value: 0 },
];

export default function CustomerDashboardPage() {
  const stats = [
    { label: 'Total Customers',   value: '2' },
    { label: 'Total Sales',       value: '₹ 0.00' },
    { label: 'Active Customers',  value: '0' },
    { label: 'Inactive Customers', value: '2' },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#f5f6fa]">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12.5px] text-gray-500 mb-4">
          <Link href="/customer" className="hover:text-blue-600 transition-colors">Customer</Link>
          <i className="ti ti-chevron-right text-[11px] text-gray-400" />
          <span className="text-blue-600 font-semibold">Customers Dashboard</span>
        </nav>

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-[22px] font-bold text-gray-900">Customers Dashboard</h1>
          <p className="text-[12.5px] text-gray-500 mt-1">
            Descriptive text for list of Customers{' '}
            <span className="text-blue-600 cursor-pointer hover:underline font-medium">Need Help?</span>
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {stats.map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-5">
              <p className="text-[13px] text-gray-500 mb-3">{s.label}</p>
              <p className="text-[22px] font-semibold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* New Customers */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-[13px] text-gray-600 font-medium mb-4">New Customers</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={newCustomersData}>
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 1]}
                  ticks={[0, 1]}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#d1d5db"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Active Customers */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-[13px] text-gray-600 font-medium mb-4">Active Customers</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={activeCustomersData}>
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 1]}
                  ticks={[0, 1]}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  dot={{ fill: '#3b82f6', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </MainLayout>
  );
}