"use client";

import AuthScreen from '@/components/AuthScreen';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
  const router = useRouter();
  const [form, setForm] = useState({ emailOrPhone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.message || 'Unable to login. Please try again.');
        return;
      }

      router.push('/home');
      router.refresh();
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

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
      <form className="space-y-3.5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-[12px] font-medium text-gray-700">
            Email or Phone
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 focus-within:border-blue-400 focus-within:bg-white">
            <i className="ti ti-user text-[16px] text-gray-400" />
            <input
              id="login-email"
              type="text"
              name="emailOrPhone"
              value={form.emailOrPhone}
              onChange={onChange}
              placeholder="Enter email or phone"
              required
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
              name="password"
              value={form.password}
              onChange={onChange}
              placeholder="at least 8 characters"
              required
              className="w-full bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 text-[12px]">
          <span className="font-medium text-blue-600">Forgot password?</span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </AuthScreen>
  );
}