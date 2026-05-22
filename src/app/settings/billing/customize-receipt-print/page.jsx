'use client';

import { useEffect, useState } from 'react';
import MainLayout from '@/components/MainLayout';

const DEFAULT_CONFIG = {
  businessName: 'BillingPro',
  subtitle: 'GST Invoice / POS Receipt',
  headerText: '',
  footerText: 'Thank you. Visit again.',
  template: 'thermal-80',
  copies: 1,
  showTaxBreakup: true,
  showDiscount: true,
  showQr: true,
  showCustomerMobile: true,
  showSku: true,
};

export default function CustomizeReceiptPrintPage() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/settings/customize-receipt-print?pageSize=1&isActive=true', { cache: 'no-store' });
        const json = await res.json();
        const record = json.data?.records?.[0];
        if (record) {
          setRecordId(record.id);
          setConfig({ ...DEFAULT_CONFIG, ...(record.config || {}) });
        }
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const setField = (key, value) => setConfig((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/customize-receipt-print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: recordId,
          name: 'Default POS Receipt',
          code: 'default',
          description: 'Default receipt template used by POS print',
          isActive: true,
          config,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Save failed');
      setRecordId(json.data?.id || recordId);
      setToast('Receipt print settings saved');
      setTimeout(() => setToast(''), 2500);
    } catch (err) {
      setToast(err.message || 'Unable to save receipt settings');
      setTimeout(() => setToast(''), 3500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-6xl space-y-5">
        {toast && (
          <div className="fixed right-4 top-16 z-[999] rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-xl">
            {toast}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-600">SETTINGS / BILLING</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">Customize Receipt Print</h1>
            <p className="mt-1 text-sm text-slate-500">Configure the default receipt that prints from POS billing.</p>
          </div>
          <button
            onClick={save}
            disabled={saving || loading}
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-800 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Business Name">
                <input value={config.businessName} onChange={(e) => setField('businessName', e.target.value)} className="form-input" />
              </Field>
              <Field label="Subtitle">
                <input value={config.subtitle} onChange={(e) => setField('subtitle', e.target.value)} className="form-input" />
              </Field>
              <Field label="Template">
                <select value={config.template} onChange={(e) => setField('template', e.target.value)} className="form-input bg-white">
                  <option value="thermal-80">Thermal 80mm</option>
                  <option value="thermal-58">Thermal 58mm</option>
                  <option value="a4">A4 Invoice</option>
                </select>
              </Field>
              <Field label="Copies">
                <input type="number" min="1" max="5" value={config.copies} onChange={(e) => setField('copies', Math.max(1, Number(e.target.value || 1)))} className="form-input" />
              </Field>
              <Field label="Header Text" wide>
                <textarea value={config.headerText} onChange={(e) => setField('headerText', e.target.value)} rows={3} className="form-input" />
              </Field>
              <Field label="Footer Text" wide>
                <textarea value={config.footerText} onChange={(e) => setField('footerText', e.target.value)} rows={3} className="form-input" />
              </Field>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ['showTaxBreakup', 'Show tax breakup'],
                ['showDiscount', 'Show discount'],
                ['showQr', 'Show digital invoice QR'],
                ['showCustomerMobile', 'Show customer mobile'],
                ['showSku', 'Show item SKU'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3">
                  <span className="text-sm font-semibold text-slate-800">{label}</span>
                  <input type="checkbox" checked={!!config[key]} onChange={(e) => setField(key, e.target.checked)} className="h-5 w-5 accent-blue-700" />
                </label>
              ))}
            </div>
          </section>

          <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-black text-slate-900">Preview</p>
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-700">
              <h2 className="text-lg font-black text-slate-950">{config.businessName || 'Store Name'}</h2>
              <p className="text-slate-500">{config.subtitle}</p>
              {config.headerText && <p className="mt-2 whitespace-pre-line">{config.headerText}</p>}
              <div className="my-3 border-t border-dashed border-slate-300" />
              <div className="text-left">
                <p><strong>Bill:</strong> POS-0001</p>
                <p><strong>Customer:</strong> Walk-in Customer</p>
              </div>
              <div className="my-3 border-t border-dashed border-slate-300" />
              <div className="flex justify-between"><span>Sample Item</span><strong>Rs.100.00</strong></div>
              {config.showTaxBreakup && <div className="mt-2 flex justify-between"><span>Tax</span><strong>Rs.5.00</strong></div>}
              <div className="mt-2 flex justify-between text-base font-black text-blue-700"><span>Total</span><span>Rs.105.00</span></div>
              {config.showQr && <div className="mx-auto mt-4 h-16 w-16 rounded border border-slate-300 bg-white" />}
              <p className="mt-3 whitespace-pre-line text-slate-500">{config.footerText}</p>
            </div>
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}

function Field({ label, wide = false, children }) {
  return (
    <label className={wide ? 'block sm:col-span-2' : 'block'}>
      <span className="mb-1 block text-xs font-bold text-slate-600">{label}</span>
      {children}
    </label>
  );
}
