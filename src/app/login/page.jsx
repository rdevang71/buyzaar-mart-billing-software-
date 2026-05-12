import AuthScreen from '@/components/AuthScreen';

const highlights = [
  {
    icon: 'ti-bolt',
    title: 'Accept payments instantly',
    text: 'Contactless, links and invoices settled to your account in real time.',
  },
  {
    icon: 'ti-chart-bar',
    title: 'Track performance',
    text: 'Live dashboards and exportable reports for every storefront.',
  },
  {
    icon: 'ti-building-store',
    title: 'Multi-Outlet Management',
    text: 'Centralizes control, structures operations, and ensures consistency across all outlets.',
  },
  {
    icon: 'ti-sparkles',
    title: 'AI-powered insights',
    text: 'Smart trends and recommendations to grow daily revenue.',
  },
];

export default function LoginPage() {
  return (
    <AuthScreen
      brandTitle="Merchant Console"
      brandTagline="Manage your storefront, anytime anywhere."
      leftPanelKicker="Merchant Console"
      leftPanelTitle="Manage your storefront, anytime anywhere."
      leftPanelSubtitle="Sign in to your Merchant console. Track settlements, manage POS terminals, and turn live data into smarter decisions, all in one place."
      eyebrow="Welcome back."
      title="Sign in to continue."
      subtitle=""
      footerText="Don't have a merchant account?"
      footerLinkText="Get Started"
      footerLinkHref="/register"
      highlights={highlights}
    >
      <form className="space-y-3.5">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-[12px] font-medium text-gray-700">
            Username
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 focus-within:border-blue-400 focus-within:bg-white">
            <i className="ti ti-user text-[16px] text-gray-400" />
            <input
              id="login-email"
              type="text"
              placeholder="Enter username"
              className="w-full bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        <div>
          <label htmlFor="login-password" className="mb-1.5 block text-[12px] font-medium text-gray-700">
            Password
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 focus-within:border-blue-400 focus-within:bg-white">
            <i className="ti ti-lock text-[16px] text-gray-400" />
            <input
              id="login-password"
              type="password"
              placeholder="at least 8 characters"
              className="w-full bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-[12px]">
          <span className="font-medium text-blue-600">Forgot password?</span>
        </div>

        <button
          type="button"
          className="w-full rounded-2xl bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700"
        >
          Sign in
        </button>
      </form>
    </AuthScreen>
  );
}