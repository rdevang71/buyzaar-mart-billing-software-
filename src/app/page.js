import MainLayout from '@/components/MainLayout';

export default function HomePage() {
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Home</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome to BillingPro</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {[
          { label: 'Total Revenue',   value: '₹45,230', icon: 'ti-currency-rupee', bg: 'bg-orange-50',  text: 'text-orange-500' },
          { label: 'Pending Orders',  value: '8',        icon: 'ti-receipt',        bg: 'bg-blue-50',    text: 'text-blue-600' },
          { label: 'Customers',       value: '124',      icon: 'ti-users',          bg: 'bg-green-50',   text: 'text-green-600' },
          { label: 'This Month',      value: '₹12,450',  icon: 'ti-chart-pie',      bg: 'bg-purple-50',  text: 'text-purple-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.bg} ${s.text}`}>
              <i className={`ti ${s.icon} text-[20px]`} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>
    </MainLayout>
  );
}