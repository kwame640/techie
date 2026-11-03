import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Loader2,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
} from 'lucide-react';
import { ApiError, apiRequest, formatGhs } from '../../lib/api';
import { rememberOrderId } from '../../lib/orders';
import type { OrderView, PaymentSettings, PaymentVerificationResult } from '../../types/orders';

type LoadState = 'loading' | 'ready' | 'error';

const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 60;

function paymentMethodName(method: string | null | undefined) {
  const value = String(method || '').toLowerCase();
  if (!value) return 'Flutterwave';
  if (value.includes('mobilemoney') || value.includes('mobile_money')) return 'Mobile money';
  if (value === 'card') return 'Card';
  if (value.includes('bank')) return 'Bank transfer';
  if (value === 'ussd') return 'USSD';
  return value.replace(/[_-]+/g, ' ');
}

function statusMeta(order: OrderView, linkExpired: boolean) {
  if (order.paymentStatus === 'paid') {
    return {
      tone: 'paid' as const,
      title: 'Payment confirmed',
      message: 'Flutterwave confirmed your payment. The seller is preparing your order.',
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
    return linkExpired
      ? {
          tone: 'pending' as const,
          title: 'Payment session expired',
          message:
            'The Flutterwave checkout session ended. If you were not charged, you can start a new payment below.',
          Icon: Clock,
        }
      : {
          tone: 'processing' as const,
          title: 'Complete your payment on Flutterwave',
          message:
            'Finish your payment on the secure Flutterwave page. This page updates automatically once it is confirmed.',
          Icon: CreditCard,
        };
  }
  if (order.paymentStatus === 'failed') {
    return {
      tone: 'failed' as const,
      title: 'Payment not confirmed',
      message:
        order.failureReason ||
        'The payment was not completed. You can try again — you have not been charged.',
      Icon: AlertCircle,
    };
  }
  return {
    tone: 'pending' as const,
    title: 'Complete your payment',
    message:
      'Pay securely with Flutterwave using mobile money, a card or bank transfer. Your order is confirmed after payment is verified.',
    Icon: CreditCard,
  };
}

export const OrderConfirmation = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const routeState = (location.state as { payError?: string } | null) || null;
  const returnedTransactionId = new URLSearchParams(location.search).get('transaction_id') || '';

  const [order, setOrder] = useState<OrderView | null>(null);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [starting, setStarting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(routeState?.payError || null);

  const pollTimerRef = useRef<number | null>(null);
  const redirectCheckedRef = useRef(false);

  const loadOrder = useCallback(async () => {
    if (!orderId) throw new Error('Missing order id.');
    const data = await apiRequest<{ order: OrderView }>(`/api/orders/${encodeURIComponent(orderId)}`);
    setOrder(data.order);
    rememberOrderId(data.order.id);
    return data.order;
  }, [orderId]);

  const applyResult = useCallback((result: PaymentVerificationResult) => {
    setOrder(result.order);
    if (result.message) setStatusMessage(result.message);
    setPollCount(0);
    if (result.state === 'paid' || result.state === 'attention') setActionError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setError(null);

    Promise.all([
      loadOrder(),
      apiRequest<{ settings: PaymentSettings }>('/api/payments/settings').catch(() => null),
    ])
      .then(([, settingsResponse]) => {
        if (cancelled) return;
        if (settingsResponse) setSettings(settingsResponse.settings);
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

  // Refresh the checkout-expiry clock while a payment is outstanding.
  useEffect(() => {
    if (order?.paymentStatus !== 'processing') return;
    const timer = window.setInterval(() => setNow(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, [order?.paymentStatus]);

  const linkExpiresAt = order?.paymentLinkExpiresAt ? Date.parse(order.paymentLinkExpiresAt) : 0;
  const linkExpired = Boolean(
    order?.paymentStatus === 'processing' && linkExpiresAt && now > linkExpiresAt
  );

  // When Flutterwave redirects back it adds ?transaction_id=... . Verify that
  // exact transaction once; the server still asks Flutterwave for the truth.
  useEffect(() => {
    if (!order || !returnedTransactionId || redirectCheckedRef.current) return;
    if (order.paymentStatus === 'paid' || order.paymentStatus === 'attention') return;
    redirectCheckedRef.current = true;

    apiRequest<PaymentVerificationResult>(
      `/api/orders/${encodeURIComponent(order.id)}/payment/verify`,
      {
        method: 'POST',
        body: JSON.stringify({ transactionId: returnedTransactionId }),
      }
    )
      .then(applyResult)
      .catch(() => {
        setStatusMessage('We could not confirm the payment yet. Tap “Check status” in a moment.');
      });
  }, [order, returnedTransactionId, applyResult]);

  // While payment is in progress, ask the server to re-check with Flutterwave.
  // The browser never decides that a payment succeeded.
  useEffect(() => {
    if (!order || order.paymentStatus !== 'processing') return;
    if (pollCount >= MAX_POLLS) return;

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
  }, [order, pollCount]);

  const verifyNow = async () => {
    if (!order) return;
    setChecking(true);
    setActionError(null);
    try {
      const result = await apiRequest<PaymentVerificationResult>(
        `/api/orders/${encodeURIComponent(order.id)}/payment/verify`,
        {
          method: 'POST',
          body: JSON.stringify(returnedTransactionId ? { transactionId: returnedTransactionId } : {}),
        }
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

  const startPayment = async () => {
    if (!order) return;
    setActionError(null);
    setStatusMessage(null);
    setStarting(true);
    try {
      const result = await apiRequest<{ order: OrderView; paymentLink?: string; message?: string }>(
        `/api/orders/${encodeURIComponent(order.id)}/pay`,
        { method: 'POST' }
      );
      setOrder(result.order);
      setPollCount(0);
      setNow(Date.now());

      const paymentLink = result.paymentLink || result.order.paymentLink;
      if (paymentLink) {
        window.location.assign(paymentLink);
        return;
      }

      setStarting(false);
      setStatusMessage(result.message || 'Flutterwave did not return a checkout link. Please try again.');
    } catch (payError) {
      setStarting(false);
      setActionError(
        payError instanceof ApiError
          ? payError.message
          : 'We could not start the Flutterwave checkout. Please try again.'
      );
      // Reflect whatever the server now knows (e.g. attention or a link that
      // was just created) instead of leaving a stale order on screen.
      loadOrder().catch(() => {});
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

  const meta = statusMeta(order, linkExpired);
  const StatusIcon = meta.Icon;
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const canPay = order.paymentStatus === 'pending' || order.paymentStatus === 'failed' || linkExpired;
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
    processing: { label: 'Pay on Flutterwave', className: 'bg-blue-100 text-blue-700' },
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
            {order.paymentStatus === 'processing' && !linkExpired && (
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

            {(canPay || order.paymentStatus === 'processing' || order.paymentStatus === 'attention') && (
              <div className="mt-5 rounded-2xl border border-[#eee5df] bg-[#fcfaf9] p-4 sm:p-5">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#6f3d27]" /> Flutterwave secure checkout
                </h3>

                {!paymentsEnabled && (
                  <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Card and mobile money payments are not configured on the NKAY server. Contact NKAY with order{' '}
                      {order.orderNumber}.
                    </span>
                  </div>
                )}

                {paymentsEnabled && order.paymentStatus === 'processing' && !linkExpired && (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-xl border border-blue-200 bg-white p-4">
                      <p className="text-sm text-[#5f5148]">
                        Your <span className="font-semibold">{formatGhs(order.total)}</span> payment is waiting on
                        Flutterwave. Finish it there and this page will confirm automatically.
                      </p>
                      <p className="text-xs text-[#927f74] mt-2">
                        Enter your mobile money PIN, card details or bank login only on the Flutterwave page. NKAY never
                        asks for them.
                      </p>
                      {order.paymentLinkExpiresAt && (
                        <p className="text-xs text-[#927f74] mt-2 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Checkout closes{' '}
                          {new Date(order.paymentLinkExpiresAt).toLocaleTimeString('en-GH', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          .
                        </p>
                      )}
                    </div>

                    {order.paymentLink && (
                      <a
                        href={order.paymentLink}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#6f3d27] px-4 py-3 text-sm font-semibold text-white hover:bg-[#5d3524] transition"
                      >
                        <ExternalLink className="w-4 h-4" /> Continue to Flutterwave
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={verifyNow}
                      disabled={checking}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#e0d3ca] bg-white px-4 py-2.5 text-sm font-semibold text-[#6f3d27] hover:bg-[#fbf5f1] transition disabled:opacity-60"
                    >
                      {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      I have paid — check status
                    </button>
                  </div>
                )}

                {paymentsEnabled && canPay && (
                  <div className="mt-3">
                    {order.paymentStatus === 'failed' && order.failureReason && (
                      <p className="mb-3 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
                        {order.failureReason}
                      </p>
                    )}

                    {linkExpired && (
                      <p className="mb-3 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800">
                        The Flutterwave checkout session expired. If you were not charged, you can start a new payment
                        below.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={startPayment}
                      disabled={starting}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#6f3d27] px-4 py-3 text-sm font-semibold text-white hover:bg-[#5d3524] transition disabled:opacity-60"
                    >
                      {starting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Opening Flutterwave…
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" /> Pay {formatGhs(order.total)} with Flutterwave
                        </>
                      )}
                    </button>
                    <p className="mt-2 text-center text-[11px] text-[#9a887d]">
                      You will be redirected to Flutterwave. Mobile money, debit/credit card and bank transfer are
                      accepted.
                    </p>
                  </div>
                )}

                {order.paymentStatus === 'attention' && (
                  <div className="mt-3 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                    <p className="font-semibold">Do not pay again.</p>
                    <p className="mt-1">{order.failureReason}</p>
                    {order.amountPaid != null && (
                      <p className="mt-1 text-xs">
                        Amount Flutterwave confirmed:{' '}
                        <span className="font-semibold">{formatGhs(order.amountPaid)}</span>
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
                  <CreditCard className="w-4 h-4" />
                  {order.paymentMethod ? paymentMethodName(order.paymentMethod) : 'Flutterwave'}
                </p>
                <p className="text-xs break-all">Reference: {reference}</p>
                {order.paymentTransactionId && (
                  <p className="text-xs break-all">Flutterwave ID: {order.paymentTransactionId}</p>
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
                  Payment verified with Flutterwave. Keep your order number for support.
                </p>
              )}

              {order.paymentStatus === 'processing' && (
                <p className="mt-3 rounded-lg bg-blue-50 p-2.5 text-[11px] text-blue-800 flex gap-1.5">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  This order is confirmed automatically once Flutterwave verifies your payment.
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
