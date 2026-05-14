'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { menuItems } from './sidebarConfig';

function getPageTitle(pathname) {
  for (const item of menuItems) {
    if (pathname === item.href || pathname.startsWith(item.href + '/')) {
      if (item.subSidebar?.groups) {
        for (const group of item.subSidebar.groups) {
          const match = group.items.find(
            (subItem) => pathname === subItem.href || pathname.startsWith(subItem.href + '/')
          );
          if (match?.label) {
            return match.label;
          }
        }
      }

      if (item.subSidebar?.simpleItems) {
        const match = item.subSidebar.simpleItems.find(
          (subItem) => pathname === subItem.href || pathname.startsWith(subItem.href + '/')
        );
        if (match?.label && match.label !== 'Inventory Dashboard') {
          return match.label;
        }
      }

      return item.label;
    }
  }

  return 'Home';
}

export default function Topbar({ onMenuOpen }) {
  const router = useRouter();
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [openProfile, setOpenProfile] = useState(false);
  const [openChangePassword, setOpenChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const profileRef = useRef(null);

  const initials = useMemo(() => {
    const name = user?.name?.trim();
    if (!name) return 'US';
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('');
  }, [user?.name]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      setLoadingUser(true);
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        const json = await res.json();

        if (!res.ok || !json.success) {
          setUser(null);
          return;
        }

        setUser(json.data.user);
      } catch {
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchCurrentUser();
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target)) {
        setOpenProfile(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setOpenProfile(false);
      router.push('/login');
      router.refresh();
    }
  };

  const onPasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.errors && typeof json.errors === 'object') {
          const firstError = Object.values(json.errors)[0];
          setPasswordError(String(firstError));
        } else {
          setPasswordError(json.message || 'Unable to change password');
        }
        return;
      }

      setPasswordSuccess('Password updated successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(err.message || 'Unable to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-[52px] bg-white border-b border-gray-200 z-50 flex items-center px-3 md:px-5">

      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuOpen}
        className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors mr-2 flex-shrink-0"
        aria-label="Open menu"
      >
        <i className="ti ti-menu-2 text-gray-700 text-[20px]" />
      </button>

      {/* Brand — hidden on mobile (shown in drawer instead) */}
      <div className="hidden md:block w-[218px] flex-shrink-0">
        <p className="text-[15px] font-extrabold text-blue-700 leading-tight">BillingPro</p>
        <p className="text-[9px] text-gray-400 leading-tight">India's No.1 Business App</p>
      </div>

      {/* Brand — mobile center */}
      <div className="md:hidden flex-1 flex justify-center">
        <p className="text-[15px] font-extrabold text-blue-700">BillingPro</p>
      </div>

      {/* Page title — desktop */}
      <div className="hidden md:block flex-1 px-4">
        <h2 className="text-[15px] font-semibold text-gray-800">{title}</h2>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        <button className="relative p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <i className="ti ti-bell text-gray-500 text-[20px]" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <button className="hidden sm:block p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <i className="ti ti-help-circle text-gray-500 text-[20px]" />
        </button>

        <div ref={profileRef} className="relative flex items-center gap-2 pl-2 md:pl-4 md:border-l border-gray-200">
          <button
            type="button"
            onClick={() => setOpenProfile((prev) => !prev)}
            className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-gray-100"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-bold text-white">{initials}</span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-[12px] font-semibold text-gray-800 leading-tight">
                {loadingUser ? 'Loading...' : user?.name || 'Guest User'}
              </p>
              <p className="text-[10px] text-gray-400 leading-tight">
                {loadingUser ? '' : (user?.role || 'user').replace('_', ' ')}
              </p>
            </div>
            <i className="ti ti-chevron-down text-gray-400 text-[13px] hidden sm:block" />
          </button>

          {openProfile && (
            <div className="absolute right-0 top-[44px] w-[320px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.16)]">
              <div className="bg-slate-100 px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-white text-[16px] font-bold">{initials}</span>
                  </div>
                  <div>
                    <p className="text-[18px] font-bold text-slate-800 leading-tight">{user?.name || 'Guest User'}</p>
                    <p className="text-[13px] text-slate-700 leading-tight">{user?.email || '-'}</p>
                    <p className="text-[13px] text-slate-700 leading-tight">{user?.phone || '-'}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-300 pt-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">User ID</p>
                    <p className="text-[22px] font-bold leading-tight text-slate-900">{user?.id ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Chain ID</p>
                    <p className="text-[22px] font-bold leading-tight text-slate-900">{user?.chain_id ?? '-'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 py-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpenProfile(false);
                    setOpenChangePassword(true);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-[14px] text-gray-700 hover:bg-gray-50"
                >
                  <i className="ti ti-lock text-[16px]" />
                  Change password
                </button>

                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-[14px] text-gray-700 hover:bg-gray-50"
                >
                  <i className="ti ti-world text-[16px]" />
                  Change language
                </button>

                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-[14px] text-gray-700 hover:bg-gray-50"
                >
                  <i className="ti ti-help-circle text-[16px]" />
                  Help & support
                </button>
              </div>

              <div className="border-t border-gray-200 p-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] text-red-600 hover:bg-red-50"
                >
                  <i className="ti ti-logout text-[16px]" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {openChangePassword && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[18px] font-semibold text-gray-900">Change password</h3>
              <button
                type="button"
                onClick={() => {
                  setOpenChangePassword(false);
                  setPasswordError('');
                  setPasswordSuccess('');
                }}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
              >
                <i className="ti ti-x text-[16px]" />
              </button>
            </div>

            <form className="space-y-3" onSubmit={submitChangePassword}>
              <input
                type="password"
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={onPasswordChange}
                placeholder="Current password"
                required
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-blue-400"
              />
              <input
                type="password"
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={onPasswordChange}
                placeholder="New password (min 8 chars)"
                minLength={8}
                required
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-blue-400"
              />
              <input
                type="password"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={onPasswordChange}
                placeholder="Confirm new password"
                minLength={8}
                required
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-blue-400"
              />

              {passwordError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                  {passwordError}
                </p>
              )}

              {passwordSuccess && (
                <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-[12px] text-green-700">
                  {passwordSuccess}
                </p>
              )}

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-700"
              >
                {passwordLoading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}