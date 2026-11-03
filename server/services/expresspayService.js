/**
 * ExpressPay (Ghana) Merchant API client.
 *
 * Contract (https://expresspaygh.com/developers/docs/accept-payments/merchant-api):
 *   1. POST /api/submit.php  -> { status: 1, token, ... }
 *   2. redirect customer to  /api/checkout.php?token=...
 *   3. ExpressPay returns    ?order-id=...&token=...
 *   4. POST /api/query.php   -> { result: 1 approved | 2 declined | 3 error | 4 pending }
 *
 * A successful submit only means ExpressPay issued a checkout token — it does
 * NOT mean the customer paid. ExpressPay has no signed webhook, so the ONLY
 * authoritative paid check is the Query API. The post-url callback is treated
 * as a hint that tells us to query.
 *
 * `status: 4` from submit/query means ExpressPay rejected the caller's IP.
 * Merchant accounts are often IP-allowlisted; on serverless hosts (Vercel) the
 * egress IP changes, so ask ExpressPay to allow the egress ranges or route
 * these calls through a fixed-IP proxy.
 */

const SANDBOX_BASE_URL = 'https://sandbox.expresspaygh.com';
const PRODUCTION_BASE_URL = 'https://expresspaygh.com';
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_SESSION_MINUTES = 60;

const IP_ALLOWLIST_HELP =
  'ExpressPay refused the request because this server IP is not allowlisted (status 4). ' +
  'Ask ExpressPay to allow your server egress IPs, or route ExpressPay API calls through a fixed-IP proxy.';

function cleanEnv(name) {
  return String(process.env[name] || '').trim();
}

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function appBaseUrl() {
  return trimTrailingSlash(
    cleanEnv('PUBLIC_APP_URL') || cleanEnv('PUBLIC_SERVER_URL') || cleanEnv('APP_URL') || cleanEnv('SITE_URL')
  );
}

function serverBaseUrl() {
  return trimTrailingSlash(cleanEnv('PUBLIC_SERVER_URL') || appBaseUrl());
}

function callbackUrl() {
  const base = serverBaseUrl();
  return base ? `${base}/api/payments/expresspay/callback` : '';
}

export function paymentReturnUrl(orderId) {
  const base = appBaseUrl();
  if (!base) return '';
  return `${base}/order/${encodeURIComponent(String(orderId || ''))}`;
}

function resolveBaseUrl() {
  const explicit = trimTrailingSlash(cleanEnv('EXPAY_BASE_URL'));
  if (explicit) return explicit;
  const env = cleanEnv('EXPAY_ENV').toLowerCase();
  const sandbox =
    env === 'sandbox' ||
    env === 'test' ||
    ['1', 'true', 'yes'].includes(cleanEnv('EXPAY_SANDBOX').toLowerCase());
  return sandbox ? SANDBOX_BASE_URL : PRODUCTION_BASE_URL;
}

export function getExpressPayConfig() {
  const merchantId = cleanEnv('EXPAY_MERCHANT_ID');
  const apiKey = cleanEnv('EXPAY_API_KEY');
  const baseUrl = resolveBaseUrl();
  const timeoutMs = Math.max(3000, Math.min(30000, Number(cleanEnv('EXPAY_TIMEOUT_MS')) || DEFAULT_TIMEOUT_MS));
  const sessionMinutes = Math.max(
    5,
    Math.min(1440, Number(cleanEnv('EXPAY_SESSION_MINUTES')) || DEFAULT_SESSION_MINUTES)
  );
  const appUrl = appBaseUrl();
  const callback = callbackUrl();

  const missing = [];
  if (!merchantId) missing.push('EXPAY_MERCHANT_ID');
  if (!apiKey) missing.push('EXPAY_API_KEY');
  if (!appUrl) missing.push('PUBLIC_APP_URL (or PUBLIC_SERVER_URL)');

  return {
    merchantId,
    apiKey,
    baseUrl,
    timeoutMs,
    sessionMinutes,
    appUrl,
    callbackUrl: callback,
    configured: missing.length === 0,
    callbackConfigured: Boolean(callback.startsWith('https://') && appUrl.startsWith('https://')),
    missing,
    mode: baseUrl.includes('sandbox') ? 'sandbox' : 'live',
  };
}

export function isExpressPayConfigured() {
  return getExpressPayConfig().configured;
}

export function publicExpressPaySettings() {
  const config = getExpressPayConfig();
  return {
    method: 'expresspay',
    providerName: 'ExpressPay',
    enabled: config.configured,
    callbackConfigured: config.callbackConfigured,
    missing: config.configured ? [] : config.missing,
  };
}

export function adminExpressPaySettings() {
  const config = getExpressPayConfig();
  return {
    ...publicExpressPaySettings(),
    mode: config.mode,
    merchantIdSet: Boolean(config.merchantId),
    apiKeySet: Boolean(config.apiKey),
    checkoutBaseUrl: `${config.baseUrl}/api/checkout.php`,
    callbackUrl: config.callbackUrl || null,
    callbackSecure: Boolean(config.callbackUrl && config.callbackUrl.startsWith('https://')),
    returnUrlPattern: config.appUrl ? `${config.appUrl}/order/:orderId` : null,
    sessionMinutes: config.sessionMinutes,
    ipAllowlistRequired: true,
  };
}

async function requestJson(url, body, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      redirect: 'follow',
      signal: controller.signal,
    });
    const text = await response.text();
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    return { response, body: parsed, text };
  } finally {
    clearTimeout(timer);
  }
}

function providerError(message, code, details) {
  const error = new Error(message);
  error.status = 502;
  error.code = code;
  error.details = details;
  return error;
}

function toAmountString(pesewas) {
  return (Math.round(Number(pesewas || 0)) / 100).toFixed(2);
}

function splitName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstname: 'NKAY', lastname: 'Customer' };
  if (parts.length === 1) return { firstname: parts[0].slice(0, 32), lastname: 'Customer' };
  return {
    firstname: parts[0].slice(0, 32),
    lastname: parts.slice(1).join(' ').slice(0, 64),
  };
}

export function checkoutUrlForToken(token) {
  const config = getExpressPayConfig();
  const value = String(token || '').trim();
  if (!value) return '';
  return `${config.baseUrl}/api/checkout.php?token=${encodeURIComponent(value)}`;
}

/**
 * Creates a hosted ExpressPay checkout for one payment attempt.
 * @returns {Promise<{ token: string, checkoutUrl: string, orderReference: string }>}
 */
export async function createCheckout({
  orderReference,
  orderNumber,
  orderId,
  amountPesewas,
  currency,
  customer,
  description,
}) {
  const config = getExpressPayConfig();
  if (!config.configured) {
    const error = new Error('Card and mobile money payments are not configured on this server.');
    error.code = 'PAYMENTS_NOT_CONFIGURED';
    error.status = 503;
    error.details = { missing: config.missing };
    throw error;
  }

  const reference = String(orderReference || '').trim();
  if (!reference) {
    throw providerError('A payment reference is required.', 'INVALID_PAYMENT_REFERENCE');
  }

  const amount = toAmountString(amountPesewas);
  if (!(Number(amount) > 0)) {
    throw providerError('This order does not have a valid total.', 'INVALID_AMOUNT');
  }

  const returnUrl = paymentReturnUrl(orderId);
  if (!returnUrl) {
    throw providerError('The payment return URL is not configured.', 'PAYMENTS_NOT_CONFIGURED');
  }

  const { firstname, lastname } = splitName(customer?.name);
  const email = String(customer?.email || '').trim();
  const phone = String(customer?.phone || '').replace(/[^\d+]/g, '');

  const form = new URLSearchParams();
  form.set('merchant-id', config.merchantId);
  form.set('api-key', config.apiKey);
  form.set('firstname', firstname);
  form.set('lastname', lastname);
  form.set('email', email);
  form.set('phonenumber', phone);
  form.set('username', email || phone || 'guest');
  form.set('currency', String(currency || 'GHS').toUpperCase());
  form.set('amount', amount);
  form.set('order-id', reference);
  form.set('order-desc', String(description || `NKAY order ${orderNumber || ''}`).slice(0, 256));
  form.set('redirect-url', returnUrl);
  // Mobile-money payments can settle minutes later; ExpressPay posts the final
  // state here. The handler always re-queries before changing an order.
  form.set('post-url', config.callbackUrl);
  form.set('payment-tokenize', 'FALSE');

  let result;
  try {
    result = await requestJson(`${config.baseUrl}/api/submit.php`, form, config.timeoutMs);
  } catch {
    throw providerError(
      'ExpressPay did not answer the payment request. Please try again.',
      'PAYMENT_PROVIDER_UNREACHABLE'
    );
  }

  const { response, body } = result;
  const status = Number(body?.status);
  if (!(response.status >= 200 && response.status < 300) || status !== 1) {
    if (status === 2) {
      throw providerError(
        'ExpressPay rejected the merchant credentials. Check EXPAY_MERCHANT_ID and EXPAY_API_KEY.',
        'PAYMENT_CREDENTIALS_REJECTED',
        { providerStatus: status }
      );
    }
    if (status === 3) {
      throw providerError(
        body?.message || 'ExpressPay rejected the payment request. Please check the order details.',
        'PAYMENT_REQUEST_REJECTED',
        { providerStatus: status }
      );
    }
    if (status === 4) {
      throw providerError(IP_ALLOWLIST_HELP, 'PAYMENT_IP_BLOCKED', { providerStatus: status });
    }
    throw providerError(
      body?.message || 'ExpressPay could not create a checkout for this order.',
      'PAYMENT_LINK_FAILED',
      { providerStatus: status || null, httpStatus: response.status }
    );
  }

  const token = String(body?.token || '').trim();
  if (!token) {
    throw providerError('ExpressPay did not return a checkout token.', 'PAYMENT_TOKEN_MISSING');
  }

  return {
    token,
    checkoutUrl: checkoutUrlForToken(token),
    orderReference: reference,
  };
}

function normalizeQueryResult(body) {
  const result = Number(body?.result);
  const amountRaw = body?.amount;
  const parsedAmount = Number(amountRaw);
  const amountPesewas =
    amountRaw === undefined || amountRaw === null || amountRaw === ''
      ? null
      : Number.isFinite(parsedAmount)
        ? Math.round(parsedAmount * 100)
        : null;

  let state = 'unknown';
  if (result === 1) state = 'paid';
  else if (result === 2) state = 'failed';
  else if (result === 3) state = 'failed';
  else if (result === 4) state = 'pending';

  return {
    ok: true,
    providerResult: Number.isFinite(result) ? result : null,
    state,
    resultText: String(body?.['result-text'] || '').trim(),
    orderReference: String(body?.['order-id'] || '').trim(),
    transactionId: String(body?.['transaction-id'] || body?.transaction_id || '').trim() || null,
    token: String(body?.token || '').trim() || null,
    amountPesewas,
    currency: String(body?.currency || '').toUpperCase(),
    dateProcessed: String(body?.['date-processed'] || '').trim() || null,
  };
}

/**
 * Authoritative payment status lookup. Never trust a callback body instead.
 */
export async function queryTransaction(token) {
  const config = getExpressPayConfig();
  if (!config.configured) {
    return { ok: false, state: 'unavailable', reason: 'not_configured' };
  }
  const value = String(token || '').trim();
  if (!value) {
    return { ok: false, state: 'unavailable', reason: 'missing_token' };
  }

  const form = new URLSearchParams();
  form.set('merchant-id', config.merchantId);
  form.set('api-key', config.apiKey);
  form.set('token', value);

  let result;
  try {
    result = await requestJson(`${config.baseUrl}/api/query.php`, form, config.timeoutMs);
  } catch {
    return { ok: false, state: 'unavailable', reason: 'network' };
  }

  const { response, body } = result;
  if (!(response.status >= 200 && response.status < 300) || !body || body.result === undefined) {
    return { ok: false, state: 'unavailable', reason: `http_${response.status}` };
  }

  const normalized = normalizeQueryResult(body);
  if (
    normalized.providerResult === 3 &&
    /(status\s*=\s*4|invalid\s*ip|ip\s*(?:is\s*)?(?:not\s*)?(?:allowed|authori[sz]ed))/i.test(normalized.resultText)
  ) {
    return { ok: false, state: 'unavailable', reason: 'ip_blocked' };
  }
  return normalized;
}

export { IP_ALLOWLIST_HELP };
