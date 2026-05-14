"use client";

import AuthScreen from '@/components/AuthScreen';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const highlights = [
  {
    icon: 'ti-shield-check',
    title: 'Set up your store profile',
    text: 'Capture the basics now so the account is ready for billing later.',
  },
  {
    icon: 'ti-user-plus',
    title: 'Suitable starter details',
    text: 'Name, business info, email, phone, and password fit this project well.',
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.agreeToTerms) {
      setError('Please accept the terms to continue.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        confirmPassword: form.confirmPassword,
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.errors && typeof json.errors === 'object') {
          const firstError = Object.values(json.errors)[0];
          setError(String(firstError));
        } else {
          setError(json.message || 'Unable to register. Please try again.');
        }
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
      eyebrow="Let’s create your account!"
      title="Create your account"
      subtitle=""
      footerText="Already have an account?"
      footerLinkText="Login"
      footerLinkHref="/login"
      highlights={highlights}
    >
      <form className="space-y-3.5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="register-name" className="mb-1.5 block text-[12px] font-medium text-gray-700">
            Full Name
          </label>
          <input
            id="register-name"
            type="text"
            name="name"
            value={form.name}
            onChange={onChange}
            required
            placeholder="Enter your Full Name"
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-400 focus:bg-white"
          />
        </div>

        <div>
          <label htmlFor="register-email" className="mb-1.5 block text-[12px] font-medium text-gray-700">
            Email
          </label>
          <input
            id="register-email"
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            required
            placeholder="Enter your Email"
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-400 focus:bg-white"
          />
        </div>

        <div>
          <label htmlFor="register-phone" className="mb-1.5 block text-[12px] font-medium text-gray-700">
            Phone Number
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 focus-within:border-blue-400 focus-within:bg-white">
            <span className="text-[13px] font-semibold text-gray-500">+91</span>
            <input
              id="register-phone"
              type="tel"
              name="phone"
              value={form.phone}
              onChange={onChange}
              required
              placeholder="Enter your Phone Number"
              className="w-full bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-password" className="mb-1.5 block text-[12px] font-medium text-gray-700">
            Password
          </label>
          <input
            id="register-password"
            type="password"
            name="password"
            value={form.password}
            onChange={onChange}
            minLength={8}
            required
            placeholder="At least 8 characters"
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-400 focus:bg-white"
          />
        </div>

        <div>
          <label htmlFor="register-confirm-password" className="mb-1.5 block text-[12px] font-medium text-gray-700">
            Confirm Password
          </label>
          <input
            id="register-confirm-password"
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={onChange}
            minLength={8}
            required
            placeholder="Re-enter your password"
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-400 focus:bg-white"
          />
        </div>

        <label className="flex items-start gap-3 text-[12px] leading-5 text-gray-600">
          <input
            type="checkbox"
            name="agreeToTerms"
            checked={form.agreeToTerms}
            onChange={onChange}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>
            By signing up on QueueBuster, you are agreeing to our Terms of Use and Privacy Policy
          </span>
        </label>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
    </AuthScreen>
  );
}