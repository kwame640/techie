/**
 * Flutterwave Standard checkout client.
 *
 * Flow (https://developer.flutterwave.com/docs/flutterwave-standard-1):
 *   1. POST /payments            -> returns a hosted checkout link
 *   2. customer pays on Flutterwave (mobile money, card or bank)
 *   3. Flutterwave redirects back to /order/:id with ?transaction_id=...
 *   4. POST webhook (charge.completed) is treated as a hint only
 *   5. GET /transactions/:id/verify is the authoritative paid check
 *
 * A successful POST /payments only means a payment link was created — it does
 * NOT mean the customer paid. Only transaction verification may mark an order
 * paid, and it must match the order reference, currency and exact amount.
 */

import { timingSafeEqual } from 'crypto';

const DEFAULT_BASE_URL = 'https://api.flutterwave.com/v3';
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_SESSION_MINUTES = 60;

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

function webhookBaseUrl() {
  return trimTrailingSlash(cleanEnv('PUBLIC_SERVER_URL') || appBaseUrl());
}

function webhookUrl() {
  const base = webhookBaseUrl();
  return base ? `${base}/api/payments/flutterwave/webhook` : '';
}

export function paymentRedirectUrl(orderId) {
  const base = appBaseUrl();
  if (!base) return '';
  return `${base}/order/${encodeURIComponent(String(orderId || ''))}`;
}

export function getFlutterwaveConfig() {
  const secretKey = cleanEnv('FLW_SECRET_KEY');
  const publicKey = cleanEnv('FLW_PUBLIC_KEY');
  const webhookSecretHash = cleanEnv('FLW_WEBHOOK_SECRET_HASH');
  const baseUrl = trimTrailingSlash(cleanEnv('FLW_BASE_URL') || DEFAULT_BASE_URL);
  const timeoutMs = Math.max(3000, Math.min(30000, Number(cleanEnv('FLW_TIMEOUT_MS')) || DEFAULT_TIMEOUT_MS));
  const sessionMinutes = Math.max(
    5,
    Math.min(1440, Number(cleanEnv('FLW_SESSION_MINUTES')) || DEFAULT_SESSION_MINUTES)
  );
  const appUrl = appBaseUrl();
  const webhook = webhookUrl();

  const missing = [];
  if (!secretKey) missing.push('FLW_SECRET_KEY');
  if (!appUrl) missing.push('PUBLIC_APP_URL (or PUBLIC_SERVER_URL)');

  return {
    secretKey,
    publicKey,
    webhookSecretHash,
    baseUrl,
    timeoutMs,
    sessionMinutes,
    appUrl,
    webhookUrl: webhook,
    configured: missing.length === 0,
    webhookConfigured: Boolean(webhook && webhook.startsWith('https://') && webhookSecretHash),
    missing,
    mode: secretKey.startsWith('FLWSECK_TEST') ? 'test' : secretKey ? 'live' : 'unset',
  };
}

export function isFlutterwaveConfigured() {
  return getFlutterwaveConfig().configured;
}

export function publicFlutterwaveSettings() {
  const config = getFlutterwaveConfig();
  return {
    method: 'flutterwave',
    providerName: 'Flutterwave',
    enabled: config.configured,
    callbackConfigured: config.webhookConfigured,
    missing: config.configured ? [] : config.missing,
  };
}

export function adminFlutterwaveSettings() {
  const config = getFlutterwaveConfig();
  return {
    ...publicFlutterwaveSettings(),
    mode: config.mode,
    secretKeySet: Boolean(config.secretKey),
    publicKeySet: Boolean(config.publicKey),
    webhookSecretSet: Boolean(config.webhookSecretHash),
    webhookUrl: config.webhookUrl || null,
    webhookSecure: Boolean(config.webhookUrl && config.webhookUrl.startsWith('https://')),
    redirectUrlPattern: config.appUrl ? `${config.appUrl}/order/:orderId` : null,
    sessionMinutes: config.sessionMinutes,
  };
}

function authHeader(config) {
  return `Bearer ${config.secretKey}`;
}

async function requestJson(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      redirect: 'follow',
      signal: controller.signal,
    });
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    return { response, body };
  } finally {
    clearTimeout(timer);
  }
}

function flutterwaveError(message, code, details) {
  const error = new Error(message);
  error.status = 502;
  error.code = code;
  error.details = details;
  return error;
}

function pickMessage(body, fallback) {
  if (body && typeof body === 'object' && typeof body.message === 'string' && body.message.trim()) {
    return body.message.trim();
  }
  return fallback;
}

function toGhs(pesewas) {
  return Math.round(Number(pesewas || 0)) / 100;
}

/**
 * Create a Flutterwave Standard hosted-checkout link.
 * @returns {Promise<{link:string, txRef:string}>}
 */
export async function createPaymentLink({
  txRef,
  amountPesewas,
  currency,
  customer,
  orderId,
  orderNumber,
  description,
}) {
  const config = getFlutterwaveConfig();
  if (!config.configured) {
    const error = new Error('Card and mobile money payments are not configured on this server.');
    error.code = 'PAYMENTS_NOT_CONFIGURED';
    error.status = 503;
    error.details = { missing: config.missing };
    throw error;
  }

  const reference = String(txRef || '').trim();
  if (!reference) {
    throw flutterwaveError('A payment reference is required.', 'INVALID_PAYMENT_REFERENCE');
  }

  const amount = toGhs(amountPesewas);
  if (!(amount > 0)) {
    throw flutterwaveError('This order does not have a valid total.', 'INVALID_AMOUNT');
  }

  const redirectUrl = paymentRedirectUrl(orderId);
  if (!redirectUrl) {
    throw flutterwaveError('The payment return URL is not configured.', 'PAYMENTS_NOT_CONFIGURED');
  }

  const payload = {
    tx_ref: reference,
    amount,
    currency: String(currency || 'GHS').toUpperCase(),
    redirect_url: redirectUrl,
    customer: {
      email: String(customer?.email || '').trim(),
      name: String(customer?.name || '').trim().slice(0, 120) || 'NKAY customer',
      phonenumber: String(customer?.phone || '').trim(),
    },
    customizations: {
      title: 'NKAY Marketplace',
      description: String(description || `NKAY order ${orderNumber || ''}`).slice(0, 120),
    },
    meta: {
      orderId: String(orderId || ''),
      orderNumber: String(orderNumber || ''),
    },
    configurations: {
      session_duration: config.sessionMinutes,
      max_retry_attempt: 5,
    },
  };

  let result;
  try {
    result = await requestJson(
      `${config.baseUrl}/payments`,
      {
        method: 'POST',
        headers: {
          Authorization: authHeader(config),
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      config.timeoutMs
    );
  } catch {
    throw flutterwaveError(
      'Flutterwave did not answer the payment request. Please try again.',
      'PAYMENT_PROVIDER_UNREACHABLE'
    );
  }

  const { response, body } = result;
  if (!(response.status >= 200 && response.status < 300) || body?.status !== 'success') {
    throw flutterwaveError(
      pickMessage(body, 'Flutterwave could not create a payment link.'),
      'PAYMENT_LINK_FAILED',
      { httpStatus: response.status }
    );
  }

  const link = String(body?.data?.link || '').trim();
  if (!link) {
    throw flutterwaveError('Flutterwave did not return a payment link.', 'PAYMENT_LINK_MISSING');
  }

  return { link, txRef: reference };
}

function normalizeStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  if (['successful', 'success', 'completed', 'paid'].includes(status)) return 'paid';
  if (['pending', 'processing', 'initiated', 'new'].includes(status)) return 'pending';
  if (['failed', 'failure', 'cancelled', 'canceled', 'declined', 'error'].includes(status)) return 'failed';
  if (['refunded', 'reversed'].includes(status)) return 'refunded';
  return 'unknown';
}

function normalizeVerification(data) {
  const rawAmount = data?.amount;
  const parsedAmount = Number(rawAmount);
  const amountPesewas = rawAmount === undefined || rawAmount === null || rawAmount === ''
    ? null
    : Number.isFinite(parsedAmount)
      ? Math.round(parsedAmount * 100)
      : null;

  return {
    ok: true,
    state: normalizeStatus(data?.status),
    transactionId: data?.id != null ? String(data.id) : null,
    txRef: String(data?.tx_ref || '').trim(),
    amountPesewas,
    currency: String(data?.currency || '').toUpperCase(),
    paymentMethod: String(data?.payment_type || data?.auth_model || '').trim().toLowerCase() || null,
    processorResponse: String(data?.processor_response || '').trim(),
    rawStatus: String(data?.status || '').trim(),
  };
}

async function verifyTransaction(url, config) {
  let result;
  try {
    result = await requestJson(
      url,
      {
        method: 'GET',
        headers: { Authorization: authHeader(config), Accept: 'application/json' },
      },
      config.timeoutMs
    );
  } catch {
    return { ok: false, state: 'unavailable', reason: 'network' };
  }

  const { response, body } = result;
  if (!(response.status >= 200 && response.status < 300) || body?.status !== 'success' || !body?.data) {
    return { ok: false, state: 'unavailable', reason: `http_${response.status}` };
  }

  return normalizeVerification(body.data);
}

/**
 * Verify a transaction using Flutterwave's transaction id.
 */
export async function verifyTransactionById(transactionId) {
  const config = getFlutterwaveConfig();
  if (!config.configured) {
    return { ok: false, state: 'unavailable', reason: 'not_configured' };
  }
  const id = String(transactionId || '').trim();
  if (!id) {
    return { ok: false, state: 'unavailable', reason: 'missing_transaction_id' };
  }
  return verifyTransaction(`${config.baseUrl}/transactions/${encodeURIComponent(id)}/verify`, config);
}

/**
 * Verify a transaction using the merchant reference (used by the reconciler
 * before Flutterwave has given us a transaction id).
 */
export async function verifyTransactionByReference(txRef) {
  const config = getFlutterwaveConfig();
  if (!config.configured) {
    return { ok: false, state: 'unavailable', reason: 'not_configured' };
  }
  const reference = String(txRef || '').trim();
  if (!reference) {
    return { ok: false, state: 'unavailable', reason: 'missing_reference' };
  }

  const url = new URL(`${config.baseUrl}/transactions/verify_by_reference`);
  url.searchParams.set('tx_ref', reference);
  return verifyTransaction(url.toString(), config);
}

/**
 * Flutterwave signs webhook calls with the dashboard "secret hash" in the
 * `verif-hash` header. Reject anything that does not match.
 */
export function verifyWebhookSignature(provided) {
  const expected = getFlutterwaveConfig().webhookSecretHash;
  if (!expected || !provided) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
