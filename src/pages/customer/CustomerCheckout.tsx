import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Loader2,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  Truck,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { ApiError, apiRequest, formatGhs } from '../../lib/api';
import { rememberOrderId } from '../../lib/orders';
import { ghanaRegions } from '../../data/marketplaceData';
import type { OrderQuote, OrderView, PaymentSettings } from '../../types/orders';
import mtnMomoLogo from '../../images/mtn-momo.svg';

interface CheckoutForm {
  name: string;
  phone: string;
  email: string;
  region: string;
  city: string;
  area: string;
  streetAddress: string;
  digitalAddress: string;
  landmark: string;
  notes: string;
}

const EMPTY_FORM: CheckoutForm = {
  name: '',
  phone: '',
  email: '',
  region: '',
  city: '',
  area: '',
  streetAddress: '',
  digitalAddress: '',
  landmark: '',
  notes: '',
};

const MOMO_PROVIDERS = [
  { id: 'MTN', name: 'MTN MoMo', short: 'MTN', className: 'bg-[#ffcc00] text-[#1a1a1a]' },
  { id: 'Telecel', name: 'Telecel Cash', short: 'T', className: 'bg-[#e60000] text-white' },
  { id: 'AT', name: 'AT Money', short: 'AT', className: 'bg-[#0a5bd3] text-white' },
];

const inputClass =
  'mt-2 w-full h-11 rounded-xl border border-[#e7ddd7] bg-white px-3 text-sm outline-none transition focus:border-[#6f3d27] focus:ring-2 focus:ring-[#6f3d27]/10';

const labelClass = 'block text-sm font-semibold text-[#4e362a]';

function loadSavedForm(): CheckoutForm {
  try {
    const raw = localStorage.getItem('nkay_checkout_details');
    if (!raw) return EMPTY_FORM;
    const parsed = JSON.parse(raw);
    return {
      ...EMPTY_FORM,
      ...Object.fromEntries(
        Object.entries(EMPTY_FORM).map(([key]) => [key, typeof parsed?.[key] === 'string' ? parsed[key] : ''])
      ),
    };
  } catch {
    return EMPTY_FORM;
  }
}

function validate(form: CheckoutForm, method: 'home' | 'pickup') {
  const errors: Record<string, string> = {};
  if (form.name.trim().length < 2) errors.name = 'Enter your full name.';
  const digits = form.phone.replace(/\D/g, '');
  if (!(/^0\d{9}$/.test(digits) || /^233\d{9}$/.test(digits))) {
    errors.phone = 'Enter a valid Ghana phone number, e.g. 055 123 4567.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Enter a valid email address for your receipt.';
  }
  if (method === 'home') {
    if (!form.region) errors.region = 'Choose your region.';
    if (!form.city.trim()) errors.city = 'Enter your city or town.';
    if (!form.area.trim()) errors.area = 'Enter your area or suburb.';
    if (!form.streetAddress.trim()) errors.streetAddress = 'Enter the street address for delivery.';
  }
  return errors;
}

function isValidGhanaPhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  return /^0\d{9}$/.test(digits) || /^233\d{9}$/.test(digits);
}

export const CustomerCheckout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { cart, clearCart } = useShop();
  const { user } = useAuth();

  const buyNowProductId = searchParams.get('productId');
  const requestedQty = Number(searchParams.get('qty') || '1');
  const buyNowQuantity = Number.isInteger(requestedQty) && requestedQty > 0 ? Math.min(requestedQty, 99) : 1;

  const checkoutItems = useMemo(
    () =>
      buyNowProductId
        ? [{ productId: buyNowProductId, quantity: buyNowQuantity }]
        : cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
    [buyNowProductId, buyNowQuantity, cart]
  );
  const itemsKey = JSON.stringify(checkoutItems);

  const [form, setForm] = useState<CheckoutForm>(loadSavedForm);
  const [deliveryMethod, setDeliveryMethod] = useState<'home' | 'pickup'>('home');
  const [provider, setProvider] = useState('MTN');
  const [paymentPhone, setPaymentPhone] = useState('');
  const paymentPhoneTouched = useRef(false);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [payError, setPayError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const orderRef = useRef<OrderView | null>(null);
  const idempotencyKeyRef = useRef<string>(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      name: current.name || user.name || '',
      email: current.email || user.email || '',
      phone: current.phone || user.phone || '',
    }));
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem('nkay_checkout_details', JSON.stringify(form));
    } catch {
      // Persisting the form is a convenience only.
    }
  }, [form]);

  // Keep the wallet number in step with the contact number until the customer
  // edits it deliberately — people often pay from a different wallet.
  useEffect(() => {
    if (!paymentPhoneTouched.current) setPaymentPhone(form.phone);
  }, [form.phone]);

  useEffect(() => {
    orderRef.current = null;
    setPayError(null);
  }, [itemsKey]);

  useEffect(() => {
    let cancelled = false;
    setSettingsLoading(true);
    apiRequest<{ settings: PaymentSettings }>('/api/payments/settings')
      .then((data) => {
        if (!cancelled) setSettings(data.settings);
      })
      .catch(() => {
        if (!cancelled) setSettings(null);
      })
      .finally(() => {
        if (!cancelled) setSettingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!checkoutItems.length) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    setQuoteError(null);

    apiRequest<{ quote: OrderQuote }>('/api/orders/quote', {
      method: 'POST',
      body: JSON.stringify({ items: checkoutItems, deliveryMethod }),
    })
      .then((data) => {
        if (!cancelled) setQuote(data.quote);
      })
      .catch((error) => {
        if (cancelled) return;
        setQuote(null);
        setQuoteError(error instanceof ApiError ? error.message : 'Could not price your order right now.');
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, deliveryMethod]);

  const update = (field: keyof CheckoutForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: '' }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPayError(null);

    const errors = validate(form, deliveryMethod);
    if (!isValidGhanaPhone(paymentPhone)) {
      errors.paymentPhone = 'Enter the mobile money number that will approve the prompt.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      document.getElementById('checkout-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (!quote || quoteLoading || quoteError) return;
    if (!settings?.enabled) {
      setPayError('Mobile money payments are not set up yet. Please contact NKAY to complete this order.');
      return;
    }

    setProcessing(true);
    try {
      let order = orderRef.current;
      if (!order) {
        const created = await apiRequest<{ order: OrderView }>('/api/orders', {
          method: 'POST',
          body: JSON.stringify({
            items: checkoutItems,
            customer: {
              name: form.name.trim(),
              phone: form.phone.trim(),
              email: form.email.trim(),
              id: user?.id,
            },
            delivery: {
              method: deliveryMethod,
              region: form.region,
              city: form.city,
              area: form.area,
              streetAddress: form.streetAddress,
              digitalAddress: form.digitalAddress,
              landmark: form.landmark,
              notes: form.notes,
            },
            idempotencyKey: idempotencyKeyRef.current,
          }),
        });
        order = created.order;
        orderRef.current = order;
        rememberOrderId(order.id);
        if (!buyNowProductId) clearCart();
      }

      // Ask Hubtel to prompt the wallet. Any response (accepted, declined or
      // uncertain) carries the updated order, and the order page is the source
      // of truth for what happens next. A thrown error still leaves a real
      // order behind, so the customer is sent there to retry safely.
      let payError: string | null = null;
      try {
        await apiRequest<{ order: OrderView }>(`/api/orders/${encodeURIComponent(order.id)}/pay`, {
          method: 'POST',
          body: JSON.stringify({ provider, phone: paymentPhone.trim() }),
        });
      } catch (payFailure) {
        payError =
          payFailure instanceof ApiError
            ? payFailure.message
            : 'We could not reach the payment prompt. You can try again on the order page.';
      }

      navigate(`/order/${order.id}`, { state: { provider, payError } });
    } catch (error) {
      if (error instanceof ApiError) {
        setPayError(error.message);
        if (error.details) setFieldErrors((current) => ({ ...current, ...error.details }));
      } else {
        setPayError('We could not place your order. Please try again.');
      }
      setProcessing(false);
    }
  };

  if (!checkoutItems.length) {
    return (
      <div className="min-h-screen bg-[#faf8f6] flex items-center justify-center p-4">
        <div className="bg-white border border-[#eee5df] rounded-2xl p-8 text-center max-w-md w-full">
          <ShoppingBag className="w-10 h-10 mx-auto text-[#6f3d27]" />
          <h1 className="text-2xl font-bold mt-4">Your cart is empty</h1>
          <p className="text-sm text-[#806e64] mt-1.5">Add a product to your cart or use Buy Now to check out a single item.</p>
          <Link to="/" className="inline-flex mt-6 bg-[#6f3d27] text-white rounded-xl px-5 py-3 font-semibold hover:bg-[#5d3524] transition">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f6] text-[#2d211b]">
      <header className="bg-white border-b border-[#eee5df] sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between">
          <Link to="/" className="text-sm font-semibold text-[#6f3d27] flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            NKAY Marketplace
          </Link>
          <span className="flex items-center gap-2 text-xs text-[#806e64]">
            <LockKeyhole className="w-4 h-4 text-[#6f3d27]" />
            Secure checkout
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Checkout</h1>
          <p className="text-sm text-[#806e64] mt-1">
            {buyNowProductId ? 'Buying now — complete your details and payment below.' : 'Review your order, add your delivery details, then pay securely.'}
          </p>
          {user && (
            <p className="text-xs text-[#927f74] mt-2 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-green-600" /> Signed in as {user.email}
            </p>
          )}
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
          <form id="checkout-form" onSubmit={submit} className="space-y-6" noValidate>
            <section className="bg-white border border-[#eee5df] rounded-2xl p-5 sm:p-7">
              <div className="flex items-center gap-3 mb-1">
                <span className="w-7 h-7 rounded-full bg-[#6f3d27] text-white text-sm font-bold flex items-center justify-center">1</span>
                <h2 className="text-lg font-bold">Delivery details</h2>
              </div>
              <p className="text-sm text-[#927f74] mb-6">We use these details to deliver your order and send your receipt.</p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="checkout-name">Full name</label>
                  <input
                    id="checkout-name"
                    className={inputClass}
                    value={form.name}
                    onChange={(event) => update('name', event.target.value)}
                    placeholder="e.g. Ama Mensah"
                    autoComplete="name"
                  />
                  {fieldErrors.name && <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>}
                </div>

                <div>
                  <label className={labelClass} htmlFor="checkout-phone">Phone number</label>
                  <input
                    id="checkout-phone"
                    className={inputClass}
                    value={form.phone}
                    onChange={(event) => update('phone', event.target.value)}
                    placeholder="055 123 4567"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                  {fieldErrors.phone && <p className="text-xs text-red-600 mt-1">{fieldErrors.phone}</p>}
                </div>

                <div>
                  <label className={labelClass} htmlFor="checkout-email">Email address</label>
                  <input
                    id="checkout-email"
                    type="email"
                    className={inputClass}
                    value={form.email}
                    onChange={(event) => update('email', event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                  {fieldErrors.email && <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>}
                </div>
              </div>

              <div className="mt-6">
                <span className={labelClass}>Delivery option</span>
                <div className="grid sm:grid-cols-2 gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('home')}
                    className={`text-left rounded-xl border p-4 transition ${deliveryMethod === 'home' ? 'border-[#6f3d27] bg-[#fbf5f1] ring-1 ring-[#6f3d27]' : 'border-[#e7ddd7] hover:border-[#c9b3a7]'}`}
                  >
                    <Truck className="w-5 h-5 text-[#6f3d27]" />
                    <p className="font-semibold mt-2 text-sm">Home delivery</p>
                    <p className="text-xs text-[#927f74] mt-0.5">Delivered to your address</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('pickup')}
                    className={`text-left rounded-xl border p-4 transition ${deliveryMethod === 'pickup' ? 'border-[#6f3d27] bg-[#fbf5f1] ring-1 ring-[#6f3d27]' : 'border-[#e7ddd7] hover:border-[#c9b3a7]'}`}
                  >
                    <Store className="w-5 h-5 text-[#6f3d27]" />
                    <p className="font-semibold mt-2 text-sm">Pickup</p>
                    <p className="text-xs text-[#927f74] mt-0.5">Collect from the seller — free</p>
                  </button>
                </div>
              </div>

              {deliveryMethod === 'home' ? (
                <div className="grid sm:grid-cols-2 gap-4 mt-6">
                  <div>
                    <label className={labelClass} htmlFor="checkout-region">Region</label>
                    <select
                      id="checkout-region"
                      className={inputClass}
                      value={form.region}
                      onChange={(event) => update('region', event.target.value)}
                    >
                      <option value="">Select region</option>
                      {ghanaRegions.map((region) => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                    {fieldErrors.region && <p className="text-xs text-red-600 mt-1">{fieldErrors.region}</p>}
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="checkout-city">City / town</label>
                    <input
                      id="checkout-city"
                      className={inputClass}
                      value={form.city}
                      onChange={(event) => update('city', event.target.value)}
                      placeholder="e.g. Accra"
                      autoComplete="address-level2"
                    />
                    {fieldErrors.city && <p className="text-xs text-red-600 mt-1">{fieldErrors.city}</p>}
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="checkout-area">Area / suburb</label>
                    <input
                      id="checkout-area"
                      className={inputClass}
                      value={form.area}
                      onChange={(event) => update('area', event.target.value)}
                      placeholder="e.g. East Legon"
                      autoComplete="address-level3"
                    />
                    {fieldErrors.area && <p className="text-xs text-red-600 mt-1">{fieldErrors.area}</p>}
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="checkout-street">Street address</label>
                    <input
                      id="checkout-street"
                      className={inputClass}
                      value={form.streetAddress}
                      onChange={(event) => update('streetAddress', event.target.value)}
                      placeholder="House number and street"
                      autoComplete="street-address"
                    />
                    {fieldErrors.streetAddress && <p className="text-xs text-red-600 mt-1">{fieldErrors.streetAddress}</p>}
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="checkout-digital">Ghana Post GPS <span className="font-normal text-[#a08b80]">(optional)</span></label>
                    <input
                      id="checkout-digital"
                      className={inputClass}
                      value={form.digitalAddress}
                      onChange={(event) => update('digitalAddress', event.target.value)}
                      placeholder="e.g. GA-123-4567"
                    />
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="checkout-landmark">Landmark <span className="font-normal text-[#a08b80]">(optional)</span></label>
                    <input
                      id="checkout-landmark"
                      className={inputClass}
                      value={form.landmark}
                      onChange={(event) => update('landmark', event.target.value)}
                      placeholder="e.g. Near the pharmacy"
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-xl bg-[#f8f4f1] border border-[#eee5df] p-4 text-sm text-[#6b564b] flex gap-3">
                  <MapPin className="w-5 h-5 text-[#6f3d27] shrink-0" />
                  <div>
                    <p className="font-semibold">Pickup locations</p>
                    <ul className="mt-1 space-y-1 text-xs">
                      {Array.from(new Set((quote?.lines || []).map((line) => `${line.businessName} — ${line.pickupLocation || 'Contact seller for pickup point'}`))).map((entry) => (
                        <li key={entry}>{entry}</li>
                      ))}
                      {!quote && <li>Pickup details will appear once your order is priced.</li>}
                    </ul>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <label className={labelClass} htmlFor="checkout-notes">Order notes <span className="font-normal text-[#a08b80]">(optional)</span></label>
                <textarea
                  id="checkout-notes"
                  value={form.notes}
                  onChange={(event) => update('notes', event.target.value)}
                  rows={2}
                  placeholder="Anything the seller or rider should know?"
                  className="mt-2 w-full rounded-xl border border-[#e7ddd7] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#6f3d27] focus:ring-2 focus:ring-[#6f3d27]/10"
                />
              </div>
            </section>

            <section className="bg-white border border-[#eee5df] rounded-2xl p-5 sm:p-7">
              <div className="flex items-center gap-3 mb-1">
                <span className="w-7 h-7 rounded-full bg-[#6f3d27] text-white text-sm font-bold flex items-center justify-center">2</span>
                <h2 className="text-lg font-bold">Payment method</h2>
              </div>
              <p className="text-sm text-[#927f74] mb-6">
                Choose your wallet and the number it is registered to. Hubtel sends a prompt to your phone —
                approve it to pay. NKAY confirms the payment before your order is processed.
              </p>

              <div className="rounded-xl border border-[#6f3d27] bg-[#fbf5f1] ring-1 ring-[#6f3d27] p-4 flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-[#6f3d27] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Mobile Money</p>
                  <p className="text-xs text-[#927f74] mt-0.5">MTN MoMo · Telecel Cash · AT Money</p>
                </div>
              </div>

              {settingsLoading && (
                <div className="mt-4 rounded-xl border border-[#eee5df] bg-[#fcfaf9] p-4 flex items-center gap-2 text-sm text-[#927f74]">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading payment details…
                </div>
              )}

              {!settingsLoading && settings?.enabled && (
                <>
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-[#4e362a]">Which wallet will you pay from?</p>
                    <div className="grid grid-cols-3 gap-2 mt-2.5">
                      {MOMO_PROVIDERS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setProvider(item.id)}
                          className={`rounded-xl border p-2.5 transition ${provider === item.id ? 'border-[#6f3d27] ring-1 ring-[#6f3d27] bg-white' : 'border-[#e7ddd7] bg-white hover:border-[#c9b3a7]'}`}
                        >
                          {item.id === 'MTN' ? (
                            <img src={mtnMomoLogo} alt="MTN MoMo" className="h-7 w-full object-contain" />
                          ) : (
                            <span className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${item.className}`}>
                              {item.short}
                            </span>
                          )}
                          <span className="mt-1.5 block text-[11px] font-medium text-[#4e362a]">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className={labelClass} htmlFor="checkout-payment-phone">
                      Mobile money number
                    </label>
                    <input
                      id="checkout-payment-phone"
                      className={inputClass}
                      value={paymentPhone}
                      onChange={(event) => {
                        paymentPhoneTouched.current = true;
                        setPaymentPhone(event.target.value);
                        setFieldErrors((current) => ({ ...current, paymentPhone: '' }));
                      }}
                      placeholder="055 123 4567"
                      inputMode="tel"
                      autoComplete="tel"
                    />
                    {fieldErrors.paymentPhone && (
                      <p className="text-xs text-red-600 mt-1">{fieldErrors.paymentPhone}</p>
                    )}
                    <p className="text-xs text-[#927f74] mt-2 flex gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      You will receive a prompt on this phone. Enter your MoMo PIN on your handset to approve —
                      never share it with anyone.
                    </p>
                  </div>
                </>
              )}

              {!settingsLoading && !settings?.enabled && (
                <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Mobile money isn’t set up yet</p>
                    <p className="mt-1">
                      Hubtel payments are not configured on the NKAY server. Please contact NKAY to finish this order.
                    </p>
                  </div>
                </div>
              )}

              {payError && (
                <div className="mt-5 rounded-xl border bg-red-50 border-red-200 p-4 text-sm text-red-700 flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p>{payError}</p>
                    {orderRef.current && (
                      <Link
                        to={`/order/${orderRef.current.id}`}
                        className="inline-flex mt-2 font-semibold underline"
                      >
                        View order {orderRef.current.orderNumber}
                      </Link>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={processing || quoteLoading || !quote || settingsLoading || !settings?.enabled}
                className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#6f3d27] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#5d3524] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending payment prompt…
                  </>
                ) : (
                  <>
                    <LockKeyhole className="w-4 h-4" />
                    {quote
                      ? `Pay with ${MOMO_PROVIDERS.find((item) => item.id === provider)?.name || 'mobile money'} · ${formatGhs(quote.total)}`
                      : 'Preparing your order…'}
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-[11px] text-[#9a887d] flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Stock is only reserved after Hubtel confirms your payment.
              </p>
            </section>
          </form>

          <aside className="bg-white border border-[#eee5df] rounded-2xl p-5 lg:sticky lg:top-24">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Order summary</h2>
              {quote && <span className="text-xs text-[#927f74]">{quote.lines.reduce((sum, line) => sum + line.quantity, 0)} item(s)</span>}
            </div>

            {quoteLoading && (
              <div className="flex items-center gap-2 py-6 justify-center text-sm text-[#927f74]">
                <Loader2 className="w-4 h-4 animate-spin" /> Pricing your order…
              </div>
            )}

            {!quoteLoading && quoteError && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                <p>{quoteError}</p>
                <Link to={buyNowProductId ? `/product/${buyNowProductId}` : '/customer/cart'} className="inline-flex mt-2 font-semibold underline">
                  Back to {buyNowProductId ? 'product' : 'cart'}
                </Link>
              </div>
            )}

            {!quoteLoading && quote && (
              <>
                <div className="space-y-4">
                  {quote.lines.map((line) => (
                    <div key={line.productId} className="flex gap-3">
                      <img
                        src={line.image}
                        alt={line.name}
                        className="w-16 h-16 rounded-xl object-cover bg-[#f1e7e0] shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <Link to={`/product/${line.productId}`} className="text-sm font-semibold leading-snug line-clamp-2 hover:text-[#6f3d27]">
                          {line.name}
                        </Link>
                        <p className="text-xs text-[#927f74] mt-0.5">{line.businessName}</p>
                        <p className="text-xs text-[#927f74] mt-0.5">
                          {formatGhs(line.unitPrice)} × {line.quantity}
                        </p>
                      </div>
                      <span className="text-sm font-semibold shrink-0">{formatGhs(line.lineTotal)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#f1ebe7] mt-5 pt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#927f74]">Subtotal</span>
                    <span>{formatGhs(quote.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#927f74]">Delivery fee</span>
                    <span>{quote.deliveryFee ? formatGhs(quote.deliveryFee) : 'Free'}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#f1ebe7] pt-3 text-base font-bold">
                    <span>Total</span>
                    <span className="text-[#6f3d27]">{formatGhs(quote.total)}</span>
                  </div>
                </div>

                <div className="mt-5 rounded-xl bg-[#f5faf5] p-3 text-xs text-[#45704c] flex gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Prices and stock are confirmed by NKAY before payment. You will only pay the amount shown here.</span>
                </div>
              </>
            )}

            <div className="mt-5 border-t border-[#f1ebe7] pt-4 space-y-2">
              <Link to={buyNowProductId ? `/product/${buyNowProductId}` : '/customer/cart'} className="text-xs font-semibold text-[#6f3d27] hover:underline">
                {buyNowProductId ? 'Back to product' : 'Edit cart'}
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};
