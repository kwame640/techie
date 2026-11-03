import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Package,
  Phone,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { ApiError, apiRequest, formatGhs } from '../../lib/api';
import type { AdminPaymentSettings, OrderView } from '../../types/orders';

type Filter = 'attention' | 'processing' | 'pending' | 'paid' | 'failed' | 'all';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'attention', label: 'Needs attention' },
  { id: 'processing', label: 'In progress' },
  { id: 'pending', label: 'Awaiting payment' },
  { id: 'paid', label: 'Paid' },
  { id: 'failed', label: 'Not confirmed' },
  { id: 'all', label: 'All orders' },
];

function paymentMethodName(method: string | null | undefined) {
  const value = String(method || '').toLowerCase();
  if (!value) return 'ExpressPay';
  if (value.includes('mobilemoney') || value.includes('mobile_money')) return 'Mobile money';
  if (value === 'card') return 'Card';
  if (value.includes('bank')) return 'Bank transfer';
  if (value === 'ussd') return 'USSD';
  return value.replace(/[_-]+/g, ' ');
}

function paymentBadge(order: OrderView) {
  if (order.paymentStatus === 'paid') {
    return { label: 'Paid', className: 'bg-green-100 text-green-700', Icon: CheckCircle2 };
  }
  if (order.paymentStatus === 'attention') {
    return { label: 'Needs attention', className: 'bg-red-100 text-red-700', Icon: AlertCircle };
  }
  if (order.paymentStatus === 'processing') {
    return { label: 'In progress', className: 'bg-blue-100 text-blue-700', Icon: Clock };
  }
  if (order.paymentStatus === 'failed') {
    return { label: 'Not confirmed', className: 'bg-red-100 text-red-700', Icon: XCircle };
  }
  return { label: 'Awaiting payment', className: 'bg-amber-100 text-amber-700', Icon: Clock };
}

function when(value: string | null | undefined) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' });
}

function ConfigFlag({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        ok ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'
      }`}
    >
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      {label}
    </span>
  );
}

export const AdminOrders = () => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('adminToken') || '' : '';

  const [orders, setOrders] = useState<OrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('attention');

  const [settings, setSettings] = useState<AdminPaymentSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [actionId, setActionId] = useState<string | null>(null);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ orders: OrderView[] }>('/api/admin/orders', {
        headers: authHeaders,
      });
      setOrders(data.orders);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Could not load orders.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    setSettingsError(null);
    try {
      const data = await apiRequest<{ settings: AdminPaymentSettings }>('/api/admin/payment-settings', {
        headers: authHeaders,
      });
      setSettings(data.settings);
    } catch (loadError) {
      setSettingsError(loadError instanceof ApiError ? loadError.message : 'Could not load payment settings.');
    } finally {
      setSettingsLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadOrders();
    loadSettings();
  }, [loadOrders, loadSettings]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const counts = useMemo(
    () => ({
      attention: orders.filter((order) => order.paymentStatus === 'attention').length,
      processing: orders.filter((order) => order.paymentStatus === 'processing').length,
      pending: orders.filter((order) => order.paymentStatus === 'pending').length,
      paid: orders.filter((order) => order.paymentStatus === 'paid').length,
      failed: orders.filter((order) => order.paymentStatus === 'failed').length,
      all: orders.length,
    }),
    [orders]
  );

  const visibleOrders = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter((order) => order.paymentStatus === filter);
  }, [orders, filter]);

  const recheck = async (order: OrderView) => {
    setActionId(order.id);
    setError(null);
    try {
      const data = await apiRequest<{ order: OrderView; state: string; message?: string }>(
        `/api/admin/orders/${encodeURIComponent(order.id)}/payment/verify`,
        { method: 'POST', headers: authHeaders }
      );
      setOrders((current) => current.map((item) => (item.id === data.order.id ? data.order : item)));
      if (data.state === 'paid') {
        setNotice(`ExpressPay confirmed payment for ${order.orderNumber}. Stock has been updated.`);
      } else if (data.state === 'attention') {
        setNotice(`ExpressPay confirmed money for ${order.orderNumber}, but the order needs attention. Do not ask the customer to pay again.`);
      } else if (data.state === 'failed') {
        setNotice(`ExpressPay reports payment was not completed for ${order.orderNumber}.`);
      } else if (data.state === 'unavailable') {
        setNotice(data.message || `ExpressPay could not be reached for ${order.orderNumber}. Try again shortly.`);
      } else {
        setNotice(`Still waiting for ExpressPay to confirm ${order.orderNumber}.`);
      }
    } catch (recheckError) {
      setError(recheckError instanceof ApiError ? recheckError.message : 'Could not re-check this payment.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      {notice && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800 flex gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <section className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="p-6 border-b flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text flex items-center gap-2">
              <ServerCog className="w-5 h-5 text-primary" /> ExpressPay payments
            </h2>
            <p className="text-sm text-text-light mt-1">
              Customers pay on ExpressPay&apos;s hosted checkout. Every payment is verified with ExpressPay&apos;s
              Query API on the server before an order is confirmed.
            </p>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1.5">
            <span
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                settings?.enabled ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {settingsLoading ? 'Checking…' : settings?.enabled ? 'Live' : 'Not configured'}
            </span>
            {settings?.enabled && (
              <span className="text-[11px] font-semibold text-text-light uppercase tracking-wide">
                {settings.mode === 'live' ? 'Live keys' : 'Sandbox keys'}
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          {settingsLoading ? (
            <div className="flex items-center gap-2 text-sm text-text-light">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading payment configuration…
            </div>
          ) : settingsError ? (
            <p className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{settingsError}</p>
          ) : settings ? (
            <div className="space-y-4">
              {settings.enabled ? (
                <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800 flex gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Checkout is collecting card, mobile money and bank payments through ExpressPay. Credentials stay on
                    the server.
                  </span>
                </div>
              ) : (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Checkout is disabled until ExpressPay is configured</p>
                    <p className="mt-1">
                      Set these environment variables on the server, then restart it:{' '}
                      <span className="font-semibold">
                        {(settings.missing.length ? settings.missing : ['server configuration']).join(', ')}
                      </span>
                      .
                    </p>
                  </div>
                </div>
              )}

              {!settings.callbackConfigured && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">The ExpressPay callback is not ready</p>
                    <p className="mt-1">
                      Set a public HTTPS <span className="font-semibold">PUBLIC_SERVER_URL</span> and register the
                      callback URL with ExpressPay. Without it, payments are still confirmed by the automatic
                      re-check, but more slowly.
                    </p>
                  </div>
                </div>
              )}

              {settings.ipAllowlistRequired && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">ExpressPay may block this server&apos;s IP</p>
                    <p className="mt-1">
                      ExpressPay returns <span className="font-semibold">status 4 / Invalid IP</span> for servers that
                      are not allowlisted. Ask ExpressPay to allow this deployment&apos;s egress IPs (Vercel IPs are
                      dynamic) or route ExpressPay API calls through a fixed-IP proxy.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-light">Callback (post-url)</p>
                  <p className="mt-1 break-all font-medium text-text">
                    {settings.callbackUrl || 'Not set — add PUBLIC_SERVER_URL'}
                  </p>
                  <p className="text-xs text-text-light mt-1">
                    {settings.callbackSecure
                      ? 'Public HTTPS endpoint. Register this URL with ExpressPay for payment notifications.'
                      : 'Must be a public HTTPS URL for ExpressPay to deliver the callback.'}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-light">Credentials</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <ConfigFlag
                      ok={settings.merchantIdSet}
                      label={settings.merchantIdSet ? 'Merchant ID set' : 'Merchant ID missing'}
                    />
                    <ConfigFlag ok={settings.apiKeySet} label={settings.apiKeySet ? 'API key set' : 'API key missing'} />
                  </div>
                  <p className="text-xs text-text-light mt-1">
                    Keys are read from <span className="font-semibold">EXPAY_MERCHANT_ID</span> and{' '}
                    <span className="font-semibold">EXPAY_API_KEY</span>.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-light">Checkout return URL</p>
                  <p className="mt-1 break-all font-medium text-text">
                    {settings.returnUrlPattern || 'Not set — add PUBLIC_APP_URL'}
                  </p>
                  <p className="text-xs text-text-light mt-1">
                    ExpressPay sends the customer back here after payment.
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-light">Checkout session</p>
                  <p className="mt-1 font-medium text-text">{settings.sessionMinutes} minutes</p>
                  <p className="text-xs text-text-light mt-1">
                    Unpaid checkouts expire after this window and can be re-issued from the order page.
                  </p>
                </div>
              </div>

              <p className="text-xs text-text-light">
                Payments are re-checked automatically every minute while this server runs. You can also re-check any
                order below.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" /> Orders &amp; payments
              </h2>
              <p className="text-sm text-text-light mt-1">
                ExpressPay confirms payments automatically. Re-check any order to ask ExpressPay for the latest
                status.
              </p>
            </div>
            <button
              onClick={loadOrders}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-primary hover:bg-gray-50 transition disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Refresh
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  filter === item.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {item.label} ({counts[item.id]})
              </button>
            ))}
          </div>
        </div>

        {loading && !orders.length ? (
          <div className="p-12 text-center text-sm text-text-light flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading orders…
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="p-12 text-center text-text-light">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>
              {filter === 'attention'
                ? 'No payments need attention.'
                : filter === 'all'
                  ? 'No orders yet.'
                  : 'No orders in this state.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {visibleOrders.map((order) => {
              const badge = paymentBadge(order);
              const BadgeIcon = badge.Icon;
              const busy = actionId === order.id;
              return (
                <article key={order.id} className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-text">{order.orderNumber}</span>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
                          <BadgeIcon className="w-3 h-3" /> {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-text-light mt-1">
                        {new Date(order.createdAt).toLocaleString('en-GH', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{formatGhs(order.total)}</p>
                      <p className="text-xs text-text-light">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} item(s)
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid md:grid-cols-2 gap-4">
                    <div className="text-sm">
                      <p className="font-medium text-text">{order.customer.name}</p>
                      <p className="text-text-light flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3.5 h-3.5" /> {order.customer.phone}
                      </p>
                      <p className="text-text-light mt-0.5 break-all">{order.customer.email}</p>
                      <p className="text-xs text-text-light mt-2 line-clamp-2">
                        {order.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}
                      </p>
                      <p className="text-xs text-text-light mt-1">
                        {order.delivery.method === 'pickup'
                          ? 'Pickup'
                          : [order.delivery.streetAddress, order.delivery.area, order.delivery.city].filter(Boolean).join(', ')}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#faf8f6] border border-[#eee5df] p-3.5 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-light flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" /> Payment
                      </p>
                      <div className="mt-1.5 space-y-0.5 text-xs text-[#5f5148]">
                        <p>
                          Method:{' '}
                          <span className="font-semibold">
                            {order.paymentMethod ? paymentMethodName(order.paymentMethod) : 'ExpressPay checkout'}
                          </span>
                        </p>
                        <p>
                          Reference: <span className="font-semibold break-all">{order.paymentReference || order.orderNumber}</span>
                        </p>
                        {order.paymentTransactionId && (
                          <p>
                            ExpressPay ID:{' '}
                            <span className="font-semibold break-all">{order.paymentTransactionId}</span>
                          </p>
                        )}
                        {order.paymentStatus === 'processing' && order.paymentLinkExpiresAt && (
                          <p>
                            Link expires: <span className="font-semibold">{when(order.paymentLinkExpiresAt)}</span>
                          </p>
                        )}
                        {order.amountPaid != null && (
                          <p>
                            Amount paid: <span className="font-semibold">{formatGhs(order.amountPaid)}</span>
                          </p>
                        )}
                      </div>
                      {order.paymentStatus === 'paid' && order.paymentVerifiedAt && (
                        <p className="mt-2 text-[11px] text-green-700 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Confirmed by ExpressPay {when(order.paymentVerifiedAt)}
                        </p>
                      )}
                      {order.failureReason && order.paymentStatus !== 'paid' && (
                        <p className="mt-2 text-[11px] text-red-600">{order.failureReason}</p>
                      )}
                    </div>
                  </div>

                  {order.paymentStatus !== 'paid' && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => recheck(order)}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#e0d3ca] bg-white px-3.5 py-2 text-xs font-semibold text-[#6f3d27] hover:bg-[#fbf5f1] transition disabled:opacity-40"
                      >
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Re-check with ExpressPay
                      </button>
                      {order.paymentStatus === 'attention' && (
                        <span className="text-[11px] text-red-600">
                          Money was received. Do not ask the customer to pay again — arrange a refund or fulfilment.
                        </span>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
