import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  Truck,
} from 'lucide-react';
import { ApiError, apiRequest, formatGhs } from '../../lib/api';
import { rememberOrderId } from '../../lib/orders';
import type { OrderView, PaymentSettings, PaymentVerificationResult } from '../../types/orders';

type LoadState = 'loading' | 'ready' | 'error';

const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 60;
const PROMPT_EXPIRY_MS = 150 * 1000;

const WALLETS = [
  { id: 'MTN', name: 'MTN MoMo', short: 'MTN', className: 'bg-[#ffcc00] text-[#1a1a1a]' },
  { id: 'Telecel', name: 'Telecel Cash', short: 'T', className: 'bg-[#e60000] text-white' },
  { id: 'AT', name: 'AT Money', short: 'AT', className: 'bg-[#0a5bd3] text-white' },
];

const inputClass =
  'mt-1.5 w-full h-11 rounded-xl border border-[#e7ddd7] bg-white px-3 text-sm outline-none transition focus:border-[#6f3d27] focus:ring-2 focus:ring-[#6f3d27]/10';
const labelClass = 'block text-xs font-semibold text-[#4e362a]';

function walletName(id: string | null | undefined) {
  return WALLETS.find((wallet) => wallet.id === id)?.name || id || 'Mobile money';
}

function isValidGhanaPhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  return /^0\d{9}$/.test(digits) || /^233\d{9}$/.test(digits);
}

function formatPhone(value: string | null | undefined) {
  const digits = String(value || '').replace(/\D/g, '');
  if (/^0\d{9}$/.test(digits)) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  if (/^233\d{9}$/.test(digits)) return `0${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  return value || '';
}

function statusMeta(order: OrderView, promptExpired: boolean) {
  if (order.paymentStatus === 'paid') {
    return {
      tone: 'paid' as const,
      title: 'Payment confirmed',
      message: 'Hubtel confirmed your mobile money payment. The seller is preparing your order.',
      Icon: CheckCircle2,
    };
  }
  if (order.paymentStatus === 'attention') {
    return {
      tone: 'attention' as const,
      title: 'Payment needs attention',
      message:
        order.failureReason ||
        'Your payment was received but NKAY needs to review it before the order can proceed. Do not pay again.',
      Icon: AlertCircle,
    };
  }
  if (order.paymentStatus === 'processing') {
    return promptExpired
      ? {
          tone: 'pending' as const,
          title: 'Prompt not approved yet',
          message:
            'The mobile money prompt was not approved in time. If it is still on your phone, approve it — otherwise send a new prompt.',
          Icon: Clock,
        }
      : {
          tone: 'processing' as const,
          title: 'Approve the prompt on your phone',
          message: `We sent a ${walletName(order.paymentProvider)} prompt to ${formatPhone(order.paymentPhone)}. Enter your PIN on your handset to approve it.`,
          Icon: Smartphone,
        };
  }
  if (order.paymentStatus === 'failed') {
    return {
      tone: 'failed' as const,
      title: 'Payment not confirmed',
      message:
        order.failureReason ||
        'The mobile money payment was not completed. You can try again — you have not been charged.',
      Icon: AlertCircle,
    };
  }
  return {
    tone: 'pending' as const,
    title: 'Complete your payment',
    message: 'Choose your wallet and send a payment prompt to your phone. Your order is confirmed after you approve it.',
    Icon: Smartphone,
  };
}

export const OrderConfirmation = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const routeState = (location.state as { provider?: string; payError?: string } | null) || null;

  const [order, setOrder] = useState<OrderView | null>(null);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const [provider, setProvider] = useState(() => {
    const value = routeState?.provider;
    return WALLETS.some((wallet) => wallet.id === value) ? (value as string) : 'MTN';
  });
  const [walletPhone, setWalletPhone] = useState('');
  const [starting, setStarting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(routeState?.payError || null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const pollTimerRef = useRef<number | null>(null);

  const loadOrder = useCallback(async () => {
    if (!orderId) throw new Error('Missing order id.');
    const data = await apiRequest<{ order: OrderView }>(`/api/orders/${encodeURIComponent(orderId)}`);
    setOrder(data.order);
    rememberOrderId(data.order.id);
    return data.order;
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setError(null);

    Promise.all([
      loadOrder(),
      apiRequest<{ settings: PaymentSettings }>('/api/payments/settings').catch(() => null),
    ])
      .then(([loaded, settingsResponse]) => {
        if (cancelled) return;
        if (settingsResponse) setSettings(settingsResponse.settings);
        setProvider((current) => loaded.paymentProvider || current);
        setWalletPhone((current) => current || loaded.paymentPhone || loaded.customer.phone);
        setState('ready');
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError instanceof ApiError ? loadError.message : 'Could not load this order.');
        setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [loadOrder]);

  // Refresh the "expired prompt" clock while a prompt is outstanding.
  useEffect(() => {
    if (order?.paymentStatus !== 'processing') return;
    const timer = window.setInterval(() => setNow(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, [order?.paymentStatus]);

  const promptedAt = order?.paymentPromptedAt ? Date.parse(order.paymentPromptedAt) : 0;
  const promptExpired = Boolean(
    order?.paymentStatus === 'processing' && promptedAt && now - promptedAt > PROMPT_EXPIRY_MS
  );

  // While a prompt is live, ask the server to re-check with Hubtel. The
  // browser never decides that a payment succeeded.
  useEffect(() => {
    if (!order || order.paymentStatus !== 'processing') return;
    if (promptExpired || pollCount >= MAX_POLLS) return;

    pollTimerRef.current = window.setTimeout(async () => {
      setPollCount((count) => count + 1);
      try {
        const result = await apiRequest<PaymentVerificationResult>(
          `/api/orders/${encodeURIComponent(order.id)}/payment/verify`,
          { method: 'POST' }
        );
        setOrder(result.order);
        if (result.message) setStatusMessage(result.message);
      } catch {
        // Keep the last known order on screen; the next poll can recover.
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current);
    };
  }, [order, pollCount, promptExpired]);

  const applyResult = (result: PaymentVerificationResult) => {
    setOrder(result.order);
    if (result.message) setStatusMessage(result.message);
    setPollCount(0);
    if (result.state === 'paid' || result.state === 'attention') setActionError(null);
  };

  const verifyNow = async () => {
    if (!order) return;
    setChecking(true);
    setActionError(null);
    try {
      const result = await apiRequest<PaymentVerificationResult>(
        `/api/orders/${encodeURIComponent(order.id)}/payment/verify`,
        { method: 'POST' }
      );
      applyResult(result);
    } catch (verifyError) {
      setActionError(
        verifyError instanceof ApiError ? verifyError.message : 'Could not check this payment right now.'
      );
    } finally {
      setChecking(false);
    }
  };

  const sendPrompt = async () => {
    if (!order) return;
    setActionError(null);
    setStatusMessage(null);

    if (!isValidGhanaPhone(walletPhone)) {
      setFieldErrors({ phone: 'Enter the mobile money number that will receive the prompt.' });
      return;
    }
    setFieldErrors({});
    setStarting(true);
    try {
      const result = await apiRequest<{ order: OrderView; message?: string }>(
        `/api/orders/${encodeURIComponent(order.id)}/pay`,
        {
          method: 'POST',
          body: JSON.stringify({ provider, phone: walletPhone.trim() }),
        }
      );
      setOrder(result.order);
      setNow(Date.now());
      setPollCount(0);
      if (result.message) setStatusMessage(result.message);
    } catch (sendError) {
      if (sendError instanceof ApiError) {
        setActionError(sendError.message);
        const failedOrder = (sendError.payload as { order?: OrderView } | undefined)?.order;
        if (failedOrder) setOrder(failedOrder);
        if (sendError.details) setFieldErrors(sendError.details);
      } else {
        setActionError('We could not send the payment prompt. Please try again.');
      }
    } finally {
      setStarting(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-[#faf8f6] flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#6f3d27] mx-auto" />
          <p className="mt-3 text-sm text-[#806e64]">Loading your order…</p>
        </div>
      </div>
    );
  }

  if (state === 'error' || !order) {
    return (
      <div className="min-h-screen bg-[#faf8f6] flex items-center justify-center p-4">
        <div className="bg-white border border-[#eee5df] rounded-2xl p-8 text-center max-w-md w-full">
          <AlertCircle className="w-10 h-10 mx-auto text-red-500" />
          <h1 className="text-xl font-bold mt-4">Order not found</h1>
          <p className="text-sm text-[#806e64] mt-1.5">{error || 'We could not find this order.'}</p>
          <Link
            to="/"
            className="inline-flex mt-6 bg-[#6f3d27] text-white rounded-xl px-5 py-3 font-semibold hover:bg-[#5d3524] transition"
          >
            Back to marketplace
          </Link>
        </div>
      </div>
    );
  }

  const meta = statusMeta(order, promptExpired);
  const StatusIcon = meta.Icon;
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const canStartPayment = order.paymentStatus === 'pending' || order.paymentStatus === 'failed';
  const reference = order.paymentReference || order.orderNumber;
  const paymentsEnabled = settings?.enabled !== false;
  const toneClasses = {
    paid: { box: 'bg-[#f1f9f2] border-[#cfe8d3]', icon: 'text-green-600', title: 'text-[#2f5c37]' },
    processing: { box: 'bg-blue-50 border-blue-200', icon: 'text-blue-600', title: 'text-blue-900' },
    failed: { box: 'bg-red-50 border-red-200', icon: 'text-red-600', title: 'text-red-800' },
    attention: { box: 'bg-red-50 border-red-200', icon: 'text-red-600', title: 'text-red-800' },
    pending: { box: 'bg-amber-50 border-amber-200', icon: 'text-amber-600', title: 'text-amber-800' },
  }[meta.tone];

  const badge = {
    paid: { label: 'Paid', className: 'bg-green-100 text-green-700' },
    processing: { label: 'Approve prompt', className: 'bg-blue-100 text-blue-700' },
    failed: { label: 'Not confirmed', className: 'bg-red-100 text-red-700' },
    attention: { label: 'Needs attention', className: 'bg-red-100 text-red-700' },
    pending: { label: 'Awaiting payment', className: 'bg-amber-100 text-amber-700' },
  }[order.paymentStatus];

  return (
    <div className="min-h-screen bg-[#faf8f6] text-[#2d211b]">
      <header className="bg-white border-b border-[#eee5df]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between">
          <Link to="/" className="text-sm font-semibold text-[#6f3d27] flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> NKAY Marketplace
          </Link>
          <Link to="/customer/orders" className="text-sm font-medium text-[#6f3d27] hover:underline">
            My orders
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className={`rounded-2xl border p-5 sm:p-6 flex gap-4 ${toneClasses.box}`}>
          <StatusIcon className={`w-8 h-8 shrink-0 ${toneClasses.icon}`} />
          <div className="min-w-0">
            <h1 className={`text-xl sm:text-2xl font-bold ${toneClasses.title}`}>{meta.title}</h1>
            <p className="text-sm mt-1 text-[#5f5148]">{meta.message}</p>
            {order.paymentStatus === 'processing' && !promptExpired && (
              <p className="text-xs mt-2 text-blue-700 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {pollCount >= MAX_POLLS
                  ? 'Still waiting. Tap “Check status” in a moment.'
                  : 'Checking automatically for confirmation…'}
              </p>
            )}
            {statusMessage && order.paymentStatus !== 'paid' && (
              <p className="text-xs mt-2 text-[#6b564b]">{statusMessage}</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-xs text-[#927f74]">
            Order <span className="font-semibold text-[#2d211b]">{order.orderNumber}</span>
          </span>
          <span className="text-xs text-[#c9b3a7]">•</span>
          <span className="text-xs text-[#927f74]">
            Placed {new Date(order.createdAt).toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
            {badge.label}
          </span>
        </div>

        <div className="grid md:grid-cols-[1fr_320px] gap-6 mt-6 items-start">
          <section className="bg-white border border-[#eee5df] rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#6f3d27]" /> Your items
            </h2>
            <div className="mt-4 divide-y divide-[#f1ebe7]">
              {order.items.map((item) => (
                <div key={item.productId} className="py-3.5 first:pt-0 last:pb-0 flex gap-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover bg-[#f1e7e0] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/product/${item.productId}`}
                      className="text-sm font-semibold leading-snug line-clamp-2 hover:text-[#6f3d27]"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs text-[#927f74] mt-1">{item.businessName}</p>
                    <p className="text-xs text-[#927f74] mt-0.5">
                      {formatGhs(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-semibold shrink-0">{formatGhs(item.lineTotal)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-[#f1ebe7] mt-4 pt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-[#927f74]">Subtotal ({itemCount} item{itemCount === 1 ? '' : 's'})</span>
                <span>{formatGhs(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#927f74]">Delivery fee</span>
                <span>{order.deliveryFee ? formatGhs(order.deliveryFee) : 'Free'}</span>
              </div>
              <div className="flex justify-between border-t border-[#f1ebe7] pt-3 text-base font-bold">
                <span>Total</span>
                <span className="text-[#6f3d27]">{formatGhs(order.total)}</span>
              </div>
            </div>

            {(canStartPayment || order.paymentStatus === 'processing') && (
              <div className="mt-5 rounded-2xl border border-[#eee5df] bg-[#fcfaf9] p-4 sm:p-5">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#6f3d27]" /> {walletName(provider)} payment
                </h3>

                {!paymentsEnabled && (
                  <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Mobile money payments are not configured on the NKAY server. Contact NKAY with order{' '}
                      {order.orderNumber}.
                    </span>
                  </div>
                )}

                {paymentsEnabled && order.paymentStatus === 'processing' && (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-xl border border-blue-200 bg-white p-4">
                      <p className="text-sm text-[#5f5148]">
                        Approve the <span className="font-semibold">{formatGhs(order.total)}</span> prompt sent to{' '}
                        <span className="font-semibold">{formatPhone(order.paymentPhone)}</span> on{' '}
                        {walletName(order.paymentProvider)}.
                      </p>
                      <p className="text-xs text-[#927f74] mt-2">
                        Enter your MoMo PIN on your handset. Never share your PIN with anyone, including NKAY.
                      </p>
                    </div>

                    {promptExpired && (
                      <>
                        <p className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800">
                          This prompt was not approved in time. If it is still on your phone you can approve it.
                          Otherwise send a new prompt below — you are only charged once.
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {WALLETS.map((wallet) => (
                            <button
                              key={wallet.id}
                              type="button"
                              onClick={() => setProvider(wallet.id)}
                              className={`rounded-xl border p-2 text-center transition ${
                                provider === wallet.id
                                  ? 'border-[#6f3d27] ring-1 ring-[#6f3d27] bg-white'
                                  : 'border-[#e7ddd7] bg-white hover:border-[#c9b3a7]'
                              }`}
                            >
                              <span
                                className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${wallet.className}`}
                              >
                                {wallet.short}
                              </span>
                              <span className="mt-1 block text-[10px] font-medium text-[#4e362a]">{wallet.name}</span>
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={sendPrompt}
                          disabled={starting}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#6f3d27] px-4 py-3 text-sm font-semibold text-white hover:bg-[#5d3524] transition disabled:opacity-60"
                        >
                          {starting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Sending prompt…
                            </>
                          ) : (
                            <>
                              <Smartphone className="w-4 h-4" /> Send prompt again
                            </>
                          )}
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={verifyNow}
                      disabled={checking}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#e0d3ca] bg-white px-4 py-2.5 text-sm font-semibold text-[#6f3d27] hover:bg-[#fbf5f1] transition disabled:opacity-60"
                    >
                      {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      I have approved it — check status
                    </button>
                  </div>
                )}

                {paymentsEnabled && canStartPayment && (
                  <div className="mt-3">
                    <div>
                      <span className={labelClass}>Wallet</span>
                      <div className="grid grid-cols-3 gap-2 mt-1.5">
                        {WALLETS.map((wallet) => (
                          <button
                            key={wallet.id}
                            type="button"
                            onClick={() => setProvider(wallet.id)}
                            className={`rounded-xl border p-2 text-center transition ${
                              provider === wallet.id
                                ? 'border-[#6f3d27] ring-1 ring-[#6f3d27] bg-white'
                                : 'border-[#e7ddd7] bg-white hover:border-[#c9b3a7]'
                            }`}
                          >
                            <span
                              className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${wallet.className}`}
                            >
                              {wallet.short}
                            </span>
                            <span className="mt-1 block text-[10px] font-medium text-[#4e362a]">{wallet.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className={`${labelClass} mt-3`} htmlFor="wallet-phone">
                      Mobile money number
                    </label>
                    <input
                      id="wallet-phone"
                      value={walletPhone}
                      onChange={(event) => {
                        setWalletPhone(event.target.value);
                        setFieldErrors((current) => ({ ...current, phone: '' }));
                      }}
                      placeholder="055 123 4567"
                      className={inputClass}
                      inputMode="tel"
                      autoComplete="tel"
                    />
                    {fieldErrors.phone && <p className="text-xs text-red-600 mt-1">{fieldErrors.phone}</p>}

                    {order.paymentStatus === 'failed' && order.failureReason && (
                      <p className="mt-3 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
                        {order.failureReason}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={sendPrompt}
                      disabled={starting}
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#6f3d27] px-4 py-3 text-sm font-semibold text-white hover:bg-[#5d3524] transition disabled:opacity-60"
                    >
                      {starting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Sending prompt…
                        </>
                      ) : (
                        <>
                          <Smartphone className="w-4 h-4" /> Send {formatGhs(order.total)} payment prompt
                        </>
                      )}
                    </button>
                    <p className="mt-2 text-center text-[11px] text-[#9a887d]">
                      Approve the prompt on your phone. Do not send money to anyone directly.
                    </p>
                  </div>
                )}

                {order.paymentStatus === 'attention' && (
                  <div className="mt-3 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                    <p className="font-semibold">Do not pay again.</p>
                    <p className="mt-1">{order.failureReason}</p>
                    {order.amountPaid != null && (
                      <p className="mt-1 text-xs">
                        Amount Hubtel confirmed: <span className="font-semibold">{formatGhs(order.amountPaid)}</span>
                      </p>
                    )}
                  </div>
                )}

                {actionError && (
                  <p className="mt-3 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
                    {actionError}
                  </p>
                )}
              </div>
            )}

            <div className="mt-5 rounded-xl bg-[#f8f4f1] border border-[#eee5df] p-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                {order.delivery.method === 'pickup' ? (
                  <Store className="w-4 h-4 text-[#6f3d27]" />
                ) : (
                  <Truck className="w-4 h-4 text-[#6f3d27]" />
                )}
                {order.delivery.method === 'pickup' ? 'Pickup' : 'Home delivery'}
              </h3>
              {order.delivery.method === 'pickup' ? (
                <p className="text-sm text-[#6b564b] mt-1.5">
                  Collect from the seller. The seller will call {order.customer.phone} when your order is ready.
                </p>
              ) : (
                <div className="text-sm text-[#6b564b] mt-1.5 flex gap-2">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-[#927f74]" />
                  <span>
                    {[
                      order.delivery.streetAddress,
                      order.delivery.area,
                      order.delivery.city,
                      order.delivery.region,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                    {order.delivery.digitalAddress ? ` (${order.delivery.digitalAddress})` : ''}
                    {order.delivery.landmark ? ` — near ${order.delivery.landmark}` : ''}
                  </span>
                </div>
              )}
              {order.delivery.method === 'home' && (
                <p className="text-xs text-[#927f74] mt-2">
                  We will contact you on {order.customer.phone} to arrange delivery.
                </p>
              )}
              {order.delivery.notes && (
                <p className="text-xs text-[#927f74] mt-1">Note: {order.delivery.notes}</p>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="bg-white border border-[#eee5df] rounded-2xl p-5">
              <h2 className="text-sm font-bold">Customer</h2>
              <p className="text-sm mt-2">{order.customer.name}</p>
              <p className="text-sm text-[#806e64] flex items-center gap-1.5 mt-1">
                <Phone className="w-3.5 h-3.5" /> {order.customer.phone}
              </p>
              <p className="text-sm text-[#806e64] mt-1 break-all">{order.customer.email}</p>
            </div>

            <div className="bg-white border border-[#eee5df] rounded-2xl p-5">
              <h2 className="text-sm font-bold">Payment</h2>
              <div className="mt-2 space-y-1.5 text-sm text-[#806e64]">
                <p className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  {order.paymentProvider ? walletName(order.paymentProvider) : 'Mobile money'}
                </p>
                {order.paymentPhone && <p className="text-xs">Wallet: {formatPhone(order.paymentPhone)}</p>}
                <p className="text-xs break-all">Reference: {reference}</p>
                {order.hubtelTransactionId && (
                  <p className="text-xs break-all">Hubtel ID: {order.hubtelTransactionId}</p>
                )}
                {order.amountPaid != null && order.paymentStatus !== 'failed' && (
                  <p className="text-xs">
                    Amount paid: <span className="font-semibold">{formatGhs(order.amountPaid)}</span>
                  </p>
                )}
                {order.paymentStatus === 'paid' && order.paymentVerifiedAt && (
                  <p className="text-xs text-green-700">
                    Confirmed {new Date(order.paymentVerifiedAt).toLocaleString('en-GH')}
                  </p>
                )}
              </div>

              {order.paymentStatus === 'paid' && (
                <p className="mt-3 rounded-lg bg-[#f5faf5] p-2.5 text-[11px] text-[#45704c] flex gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  Payment confirmed by Hubtel. Keep your order number for support.
                </p>
              )}

              {order.paymentStatus === 'processing' && (
                <p className="mt-3 rounded-lg bg-blue-50 p-2.5 text-[11px] text-blue-800 flex gap-1.5">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  Your order is confirmed automatically once you approve the prompt.
                </p>
              )}

              {order.paymentStatus !== 'paid' && (
                <button
                  onClick={verifyNow}
                  disabled={checking}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#e0d3ca] px-4 py-2.5 text-sm font-semibold text-[#6f3d27] hover:bg-[#fbf5f1] transition disabled:opacity-60"
                >
                  {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Check status
                </button>
              )}
            </div>

            <Link
              to="/"
              className="flex items-center justify-center gap-2 rounded-xl border border-[#e0d3ca] bg-white px-4 py-3 text-sm font-semibold text-[#6f3d27] hover:bg-[#fbf5f1] transition"
            >
              <Package className="w-4 h-4" /> Continue shopping
            </Link>
          </aside>
        </div>

        {order.paymentStatus === 'paid' && (
          <p className="mt-6 text-center text-xs text-[#927f74]">
            Need help? Quote order {order.orderNumber} or contact NKAY support.
          </p>
        )}
      </main>
    </div>
  );
};
