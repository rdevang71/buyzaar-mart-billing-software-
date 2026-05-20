'use client';

import { useEffect, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function MasterDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(getPastDate(30));
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [storeId, setStoreId] = useState('all');
  const [stores, setStores] = useState([]);

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [dateFrom, dateTo, storeId]);

  async function fetchStores() {
    try {
      const res = await fetch('/api/stores');
      const json = await res.json();
      if (json.success && json.data?.stores) {
        setStores(json.data.stores);
      }
    } catch (err) {
      console.error('Error fetching stores:', err);
    }
  }

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('date_from', dateFrom);
      params.set('date_to', dateTo);
      if (storeId !== 'all') params.set('store_id', storeId);

      const res = await fetch(`/api/dashboard/analytics?${params}`);

      if (!res.ok) {
        console.error(`API error: ${res.status}`);
        setLoading(false);
        return;
      }

      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="p-8 text-center">
          <div className="inline-block mb-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
          </div>
          <p className="text-lg font-semibold text-gray-700">Loading dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching analytics data</p>
        </div>
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout>
        <div className="p-8">
          <h1 className="text-4xl font-black text-gray-900 mb-6">Master Dashboard</h1>
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
            <div className="flex gap-4">
              <div className="text-2xl">⚠️</div>
              <div>
                <h3 className="text-lg font-bold text-yellow-900 mb-2">No Data Available</h3>
                <p className="text-yellow-800 font-medium">Dashboard data could not be loaded. Please ensure you are logged in and try again.</p>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <MainLayout>
      <div className="p-6 bg-gray-50 min-h-screen">
        <h1 className="text-5xl font-black text-gray-900 mb-8 tracking-tight">Master Dashboard</h1>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-5 mb-8 flex gap-4 flex-wrap border border-gray-200">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border-2 border-gray-300 rounded-lg px-4 py-2 font-medium text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border-2 border-gray-300 rounded-lg px-4 py-2 font-medium text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Store</label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="border-2 border-gray-300 rounded-lg px-4 py-2 font-medium text-gray-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Stores</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <KPICard
            title="Total Sales"
            value={`₹${parseFloat(data.summary?.total_sales || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            subtitle={`${data.summary?.total_transactions || 0} transactions`}
            color="bg-blue-50 border-blue-300"
          />
          <KPICard
            title="Gross Profit"
            value={`₹${parseFloat(data.profitability?.gross_profit || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            subtitle={`${data.profitability?.gross_margin_percent || 0}% margin`}
            color="bg-green-50 border-green-300"
          />
          <KPICard
            title="Tax Collected"
            value={`₹${parseFloat(data.summary?.total_tax || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            subtitle={`GST & other taxes`}
            color="bg-purple-50 border-purple-300"
          />
          <KPICard
            title="Unique Customers"
            value={data.summary?.unique_customers || 0}
            subtitle={`Avg: ₹${parseFloat(data.summary?.avg_transaction_value || 0).toFixed(0)}/txn`}
            color="bg-orange-50 border-orange-300"
          />
        </div>

        {/* Inventory Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-2xl font-black text-gray-900 mb-5">Inventory Valuation</h3>
            <div className="space-y-4">
              <StatRow label="Total Products" value={data.inventory?.total_products || 0} />
              <StatRow label="Total Units" value={data.inventory?.total_stock_units || 0} />
              <StatRow
                label="Value @ Cost"
                value={`₹${parseFloat(data.inventory?.inventory_value_cost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              />
              <StatRow
                label="Value @ Retail"
                value={`₹${parseFloat(data.inventory?.inventory_value_retail || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-2xl font-black text-gray-900 mb-5">Top 5 Payment Modes</h3>
            {data.payment_modes?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.payment_modes}
                    dataKey="amount"
                    nameKey="payment_mode"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {data.payment_modes.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${parseFloat(value).toFixed(0)}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-600 font-medium">No payment data</p>}
          </div>
        </div>

        {/* Sales Trends */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-gray-200">
          <h3 className="text-2xl font-black text-gray-900 mb-5">Daily Sales Trend</h3>
          {data.sales_trends?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.sales_trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `₹${parseFloat(value).toFixed(0)}`} />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#3b82f6" name="Sales" strokeWidth={2} />
                <Line type="monotone" dataKey="profit" stroke="#10b981" name="Profit" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-600 font-medium">No sales data</p>}
        </div>

        {/* Store Performance */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-gray-200">
          <h3 className="text-2xl font-black text-gray-900 mb-5">Store-wise Performance</h3>
          {data.store_performance?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.store_performance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="store_name" />
                <YAxis />
                <Tooltip formatter={(value) => `₹${parseFloat(value).toFixed(0)}`} />
                <Legend />
                <Bar dataKey="sales" fill="#3b82f6" name="Sales" />
                <Bar dataKey="profit" fill="#10b981" name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-600 font-medium">No store data</p>}
        </div>

        {/* Top Customers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-2xl font-black text-gray-900 mb-5">Top 10 Customers</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-900">Name</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-900">Spent</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-900">Txns</th>
                  </tr>
                </thead>
                <tbody className="text-gray-800">
                  {data.top_customers?.slice(0, 10).map(customer => (
                    <tr key={customer.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{customer.name}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">₹{parseFloat(customer.total_spent).toFixed(0)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700">{customer.transactions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-2xl font-black text-gray-900 mb-5">Staff Productivity</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-900">Staff</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-900">Bills</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-900">Sales</th>
                  </tr>
                </thead>
                <tbody className="text-gray-800">
                  {data.staff_productivity?.slice(0, 10).map(staff => (
                    <tr key={staff.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{staff.name}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{staff.bills_created}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">₹{parseFloat(staff.sales_value).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Stock Alerts */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-gray-200">
          <h3 className="text-2xl font-black text-gray-900 mb-5">Stock Alerts</h3>
          {data.stock_alerts?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-900">Product</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-900">SKU</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-900">Stock</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-900">Status</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-900">30-Day Sales</th>
                  </tr>
                </thead>
                <tbody className="text-gray-800">
                  {data.stock_alerts.map(item => (
                    <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                      <td className="px-4 py-3 font-medium text-gray-700">{item.sku}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{item.current_stock}</td>
                      <td className={`px-4 py-3 font-bold ${item.stock_status === 'Out of Stock' ? 'text-red-600' : 'text-yellow-600'}`}>
                        {item.stock_status}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{item.last_30days_sales}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-gray-600 font-medium">No stock alerts</p>}
        </div>

        {/* Fast Moving Items */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-2xl font-black text-gray-900 mb-5">Product Movement Analysis</h3>
          {data.moving_items?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-900">Product</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-900">SKU</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-900">Qty Sold</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-900">Revenue</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-900">Movement</th>
                  </tr>
                </thead>
                <tbody className="text-gray-800">
                  {data.moving_items.slice(0, 20).map(item => (
                    <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                      <td className="px-4 py-3 font-medium text-gray-700">{item.sku}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{item.quantity_sold}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">₹{parseFloat(item.revenue).toFixed(0)}</td>
                      <td className={`px-4 py-3 font-bold ${item.movement_category === 'Fast-Moving' ? 'text-green-600' : item.movement_category === 'Medium-Moving' ? 'text-yellow-600' : 'text-red-600'}`}>
                        {item.movement_category}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-gray-600 font-medium">No movement data</p>}
        </div>
      </div>
    </MainLayout>
  );
}

function KPICard({ title, value, subtitle, color }) {
  return (
    <div className={`${color} border-2 rounded-lg p-6 shadow-md`}>
      <h3 className="text-gray-700 text-sm font-bold uppercase tracking-wide">{title}</h3>
      <p className="text-3xl font-black text-gray-900 mt-3">{value}</p>
      <p className="text-xs text-gray-600 font-semibold mt-2">{subtitle}</p>
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100">
      <span className="text-gray-700 font-semibold">{label}</span>
      <span className="font-black text-lg text-gray-900">{value}</span>
    </div>
  );
}

function getPastDate(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}
