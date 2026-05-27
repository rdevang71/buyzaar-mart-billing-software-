'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { menuItems } from './sidebarConfig';
import { useUser } from '@/hooks/useUser';
import { filterMenuItemsForUser, getPageTitleForMenu } from '@/lib/accessControl';

export default function Topbar({ onMenuOpen, sidebarExpanded = false }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: loadingUser } = useUser();
  const accessibleMenuItems = useMemo(() => filterMenuItemsForUser(menuItems, user), [user]);
  const title = getPageTitleForMenu(accessibleMenuItems, pathname);
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
  const [openNotifications, setOpenNotifications] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [returnRequests, setReturnRequests] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [requisitionRequests, setRequisitionRequests] = useState([]);
  const [procurementAlerts, setProcurementAlerts] = useState([]);
  const profileRef = useRef(null);
  const notificationRef = useRef(null);

  const initials = useMemo(() => {
    const name = user?.name?.trim();
    if (!name) return 'US';
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('');
  }, [user?.name]);

  const roleLabel = useMemo(() => {
    if (!user?.role) return 'Guest';
    return user.role
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }, [user?.role]);

  const storeLabel = useMemo(() => {
    if (!user) return '-';
    if (user.role === 'super_admin') return 'All Stores';
    if (Array.isArray(user.assigned_store_names) && user.assigned_store_names.length > 0) {
      return user.assigned_store_names.length === 1
        ? user.assigned_store_names[0]
        : `${user.assigned_store_names.length} Stores`;
    }
    if (Array.isArray(user.assigned_stores) && user.assigned_stores.length > 0) {
      return `${user.assigned_stores.length} Stores`;
    }
    return 'No Store Assigned';
  }, [user]);

  const canReviewReturns = user?.role === 'super_admin' || user?.role === 'admin' || user?.permissions?.includes('*');
  const canReviewRequisitions =
    user?.role === 'super_admin' ||
    user?.role === 'admin' ||
    user?.permissions?.includes('*') ||
    user?.permissions?.includes('MANAGE_INVENTORY');
  const canReviewProcurement =
    user?.role === 'super_admin' ||
    user?.role === 'admin' ||
    user?.permissions?.includes('*') ||
    user?.permissions?.includes('MANAGE_PURCHASE_ORDERS') ||
    user?.permissions?.includes('MANAGE_VENDORS');
  const returnNotificationTitle = canReviewReturns ? 'Return Requests' : 'My Return Updates';
  const notificationCount = returnRequests.length + lowStockAlerts.length + requisitionRequests.length + procurementAlerts.length;

  const loadReturnNotifications = useCallback(async () => {
    if (!user) {
      setReturnRequests([]);
      return;
    }

    try {
      const endpoint = canReviewReturns
        ? '/api/pos/returns?status=pending&pageSize=10'
        : '/api/pos/returns?scope=mine&status=reviewed&pageSize=10';
      const response = await fetch(endpoint, { cache: 'no-store' });
      const json = await response.json();
      setReturnRequests(json.success && Array.isArray(json.data) ? json.data : []);
    } catch {
      setReturnRequests([]);
    }
  }, [canReviewReturns, user]);

  const loadLowStockNotifications = useCallback(async () => {
    if (!user) {
      setLowStockAlerts([]);
      return;
    }

    try {
      const response = await fetch('/api/notifications/low-stock', { cache: 'no-store' });
      const json = await response.json();
      const alerts = json.success && Array.isArray(json.data?.alerts) ? json.data.alerts : [];
      setLowStockAlerts(alerts);
    } catch {
      setLowStockAlerts([]);
    }
  }, [user]);

  const loadRequisitionNotifications = useCallback(async () => {
    if (!user || !canReviewRequisitions) {
      setRequisitionRequests([]);
      return;
    }

    try {
      const response = await fetch('/api/inventory/stockrequisition', { cache: 'no-store' });
      const json = await response.json();
      const records = Array.isArray(json.records) ? json.records : [];
      setRequisitionRequests(
        records
          .filter((record) => String(record.approvalStatus || '').toLowerCase() === 'pending')
          .slice(0, 10)
      );
    } catch {
      setRequisitionRequests([]);
    }
  }, [canReviewRequisitions, user]);

  const loadProcurementNotifications = useCallback(async () => {
    if (!user || !canReviewProcurement) {
      setProcurementAlerts([]);
      return;
    }

    try {
      const response = await fetch('/api/notifications/procurement', { cache: 'no-store' });
      const json = await response.json();
      setProcurementAlerts(Array.isArray(json.alerts) ? json.alerts : []);
    } catch {
      setProcurementAlerts([]);
    }
  }, [canReviewProcurement, user]);

  const loadNotifications = useCallback(() => {
    loadReturnNotifications();
    loadLowStockNotifications();
    loadRequisitionNotifications();
    loadProcurementNotifications();
  }, [loadLowStockNotifications, loadProcurementNotifications, loadRequisitionNotifications, loadReturnNotifications]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications, pathname]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target)) {
        setOpenProfile(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setOpenNotifications(false);
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
        if (json.errors) {
          // `validationError` may return an array of error objects or a single object.
          if (Array.isArray(json.errors) && json.errors.length) {
            const firstErr = json.errors[0];
            if (typeof firstErr === 'object') {
              const val = Object.values(firstErr)[0];
              setPasswordError(String(val));
            } else {
              setPasswordError(String(firstErr));
            }
          } else if (typeof json.errors === 'object') {
            const firstError = Object.values(json.errors)[0];
            setPasswordError(String(firstError));
          } else {
            setPasswordError(json.message || 'Unable to change password');
          }
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
    <header className="fixed top-0 left-0 right-0 h-[56px] bg-white/90 backdrop-blur-md border-b border-slate-200/80 z-50 flex items-center px-3 md:px-5 shadow-[0_1px_16px_rgba(15,23,42,0.06)]">

      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuOpen}
        className="md:hidden p-2 rounded-xl hover:bg-indigo-50 transition-colors mr-2 flex-shrink-0"
        aria-label="Open menu"
      >
        <i className="ti ti-menu-2 text-slate-700 text-[20px]" />
      </button>

      {/* Brand — hidden on mobile (shown in drawer instead) */}
      <button
        type="button"
        onClick={() => router.push('/home')}
        className={`hidden md:flex flex-shrink-0 items-center transition-all ${
          sidebarExpanded ? 'w-[240px] justify-start pl-8' : 'w-[64px] justify-center'
        }`}
        aria-label="Go to home"
      >
        {sidebarExpanded ? (
          <span className="text-[18px] font-black leading-none text-indigo-700">BillingPro</span>
        ) : (
          <span className="sr-only">BillingPro</span>
        )}
      </button>

      {/* Brand — mobile center */}
      <div className="md:hidden flex-1 flex justify-center">
        <p className="text-[15px] font-extrabold text-indigo-700">BillingPro</p>
      </div>

      {/* Page title — desktop */}
      <div className="hidden md:flex flex-1 items-center gap-3 px-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
          <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        <div ref={notificationRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setOpenNotifications((prev) => !prev);
              loadNotifications();
            }}
            className="relative rounded-xl p-2 text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
            aria-label="Notifications"
          >
            <i className="ti ti-bell text-slate-500 text-[20px]" />
            {notificationCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
                {notificationCount}
              </span>
            )}
          </button>

          {openNotifications && (
            <div className="absolute right-0 top-[40px] w-[340px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.16)]">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-bold text-gray-900">Notifications</p>
                <button
                  type="button"
                  onClick={loadNotifications}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                >
                  Refresh
                </button>
              </div>
              {notificationCount === 0 ? (
                <p className="px-4 py-5 text-sm text-gray-500">No notifications right now.</p>
              ) : (
                <div className="max-h-80 overflow-auto py-1">
                  {lowStockAlerts.length > 0 && (
                    <div className="border-b border-gray-100">
                      <p className="px-4 pb-1 pt-3 text-[11px] font-black uppercase tracking-widest text-amber-600">
                        Inventory Alerts
                      </p>
                      {lowStockAlerts.map((alert) => (
                        <button
                          key={alert.id}
                          type="button"
                          onClick={() => {
                            setOpenNotifications(false);
                            router.push('/reports/inventory/low-stock-products');
                          }}
                          className="block w-full border-t border-gray-100 px-4 py-3 text-left hover:bg-amber-50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {alert.productName} is {alert.severity === 'out_of_stock' ? 'out of stock' : 'running low'}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-gray-500">
                                {alert.storeName || 'Store'}{alert.sku ? ` - ${alert.sku}` : ''}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">
                              {Number(alert.availableQty || 0)} left
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {requisitionRequests.length > 0 && (
                    <div className="border-b border-gray-100">
                      <p className="px-4 pb-1 pt-3 text-[11px] font-black uppercase tracking-widest text-violet-600">
                        Stock Requisitions
                      </p>
                      {requisitionRequests.map((request) => (
                        <button
                          key={request.id}
                          type="button"
                          onClick={() => {
                            setOpenNotifications(false);
                            router.push('/inventory/stockrequisition');
                          }}
                          className="block w-full border-t border-gray-100 px-4 py-3 text-left hover:bg-violet-50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {request.transactionId || `REQ-${request.id}`} needs approval
                              </p>
                              <p className="mt-0.5 truncate text-xs text-gray-500">
                                {request.destinationName || 'Destination'}{request.requestedBy ? ` - ${request.requestedBy}` : ''}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-violet-100 px-2 py-1 text-xs font-bold text-violet-700">
                              {Number(request.totalItems || 0)} items
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {procurementAlerts.length > 0 && (
                    <div className="border-b border-gray-100">
                      <p className="px-4 pb-1 pt-3 text-[11px] font-black uppercase tracking-widest text-emerald-600">
                        Procurement
                      </p>
                      {procurementAlerts.map((alert) => (
                        <button
                          key={alert.id}
                          type="button"
                          onClick={() => {
                            setOpenNotifications(false);
                            router.push(alert.href || '/purchase');
                          }}
                          className="block w-full border-t border-gray-100 px-4 py-3 text-left hover:bg-emerald-50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {alert.title || 'Procurement item pending'}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-gray-500">
                                {alert.transactionId || alert.vendorName || 'Record'}{alert.storeName ? ` - ${alert.storeName}` : ''}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                              {alert.status || 'Pending'}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {returnRequests.length > 0 && (
                    <p className="px-4 pb-1 pt-3 text-[11px] font-black uppercase tracking-widest text-blue-600">
                      {returnNotificationTitle}
                    </p>
                  )}
                  {returnRequests.map((request) => (
                    <button
                      key={request.id}
                      type="button"
                      onClick={() => {
                        setOpenNotifications(false);
                        router.push('/sales/returns');
                      }}
                      className="block w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {canReviewReturns
                              ? `${request.return_type === 'exchange' ? 'Exchange' : 'Return'} request #${request.id}`
                              : request.status === 'approved'
                                ? `Return request #${request.id} ready to proceed`
                                : `Return request #${request.id} ${request.status}`}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-gray-500">
                            {request.store_name || `Store ${request.store_id || '-'}`} - Bill {request.bill_number || request.original_bill_id}
                          </p>
                        </div>
                        <span className={`shrink-0 text-xs font-bold ${request.status === 'declined' ? 'text-red-700' : 'text-green-700'}`}>
                          Rs.{Number(request.refund_amount || 0).toFixed(0)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button className="hidden sm:block rounded-xl p-2 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700">
          <i className="ti ti-help-circle text-gray-500 text-[20px]" />
        </button>

        <div ref={profileRef} className="relative flex items-center gap-2 pl-2 md:pl-4 md:border-l border-slate-200">
          <button
            type="button"
            onClick={() => setOpenProfile((prev) => !prev)}
            className="flex items-center gap-2 rounded-2xl px-1.5 py-1 transition-colors hover:bg-blue-50"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-[0_8px_18px_rgba(37,99,235,0.22)]">
              <span className="text-[11px] font-bold text-white">{initials}</span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-[12px] font-semibold text-gray-800 leading-tight">
                {loadingUser ? 'Loading...' : user?.name || 'Guest User'}
              </p>
              <p className="text-[10px] text-gray-400 leading-tight">
                {loadingUser ? '' : roleLabel}
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
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Role</p>
                    <p className="text-[16px] font-bold leading-tight text-slate-900">{roleLabel}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Store Access</p>
                    <p className="text-[16px] font-bold leading-tight text-slate-900">{storeLabel}</p>
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

      {isClient && openChangePassword &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-start md:items-center justify-center bg-black/30 px-4 py-6 overflow-auto">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl max-h-[calc(100vh-120px)] overflow-auto">
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
          </div>,
          document.body
        )}
    </header>
  );
}
