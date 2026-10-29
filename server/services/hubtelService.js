/**
 * Hubtel Direct Receive Money client.
 *
 * Contract (verified against Hubtel's 2026 Direct Receive Money API):
 *   POST https://rmp.hubtel.com/merchantaccount/merchants/{account}/receive/mobilemoney
 *   GET  https://api-txnstatus.hubtel.com/transactions/{account}/status?clientReference=...
 *
 * Authentication is HTTP Basic (client id : client secret). A successful
 * initiation only means Hubtel accepted the request and is prompting the
 * wallet — it does NOT mean the customer has paid. The authoritative paid
 * state comes from the status endpoint (and is re-checked after callbacks).
 *
 * The base URLs are configurable so the integration can be exercised against
 * a local stub during tests. They are never derived from user input.
 */

const DEFAULT_RECEIVE_BASE_URL = 'https://rmp.hubtel.com';
const DEFAULT_STATUS_BASE_URL = 'https://api-txnstatus.hubtel.com';
const DEFAULT_TIMEOUT_MS = 15000;

export const PAYMENT_PROVIDERS = [
  { id: 'MTN', name: 'MTN MoMo', channel: 'mtn-gh' },
  { id: 'Telecel', name: 'Telecel Cash', channel: 'vodafone-gh' },
  { id: 'AT', name: 'AT Money', channel: 'tigo-gh' },
];

const ACCEPTED_CODES = new Set(['0000', '0001']);
// Hubtel codes that are a definitive refusal. Any other unknown code is treated
// as "submission unknown" so we never invite the customer to pay twice.
const REJECTED_CODES = new Set(['2001', '3050', '4000', '4070', '4075', '4101', '4103']);

const PROVIDER_ERRORS = {
  '2001': 'The wallet has insufficient funds.',
  '3050': 'The mobile money prompt was declined.',
  '4000': 'The mobile money number was rejected by Hubtel.',
  '4070': 'The wallet could not be reached. Check the number and try again.',
  '4075': 'The transaction was cancelled on the phone.',
  '4101': 'The mobile money number is not valid for this wallet.',
  '4103': 'The mobile money prompt timed out.',
};

function cleanEnv(name) {
  return String(process.env[name] || '').trim();
}

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function normalizeDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

export function normalizeGhanaMsisdn(value) {
  let digits = normalizeDigits(value);
  if (digits.startsWith('233')) digits = digits.slice(3);
  if (digits.length === 10 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length !== 9) return '';
  return `233${digits}`;
}

export function isGhanaMsisdn(value) {
  return Boolean(normalizeGhanaMsisdn(value));
}

export function toLocalMsisdn(value) {
  const normalised = normalizeGhanaMsisdn(value);
  return normalised ? `0${normalised.slice(3)}` : '';
}

export function providerById(id) {
  const needle = String(id || '').trim().toLowerCase();
  return PAYMENT_PROVIDERS.find((provider) => provider.id.toLowerCase() === needle) || null;
}

export function providerPublicList() {
  return PAYMENT_PROVIDERS.map(({ id, name }) => ({ id, name }));
}

function callbackUrl() {
  const token = cleanEnv('HUBTEL_CALLBACK_TOKEN');
  const explicit = cleanEnv('HUBTEL_CALLBACK_URL');
  const base = cleanEnv('PUBLIC_SERVER_URL') || cleanEnv('APP_URL') || cleanEnv('SITE_URL');

  let url = explicit || (base ? `${trimTrailingSlash(base)}/api/payments/hubtel/callback` : '');
  if (!url) return '';
  if (token) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('token', token);
      url = parsed.toString();
    } catch {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}token=${encodeURIComponent(token)}`;
    }
  }
  return url;
}

export function getHubtelConfig() {
  const clientId = cleanEnv('HUBTEL_CLIENT_ID');
  const clientSecret = cleanEnv('HUBTEL_CLIENT_SECRET');
  const accountNumber = cleanEnv('HUBTEL_MERCHANT_ACCOUNT_NUMBER');
  const receiveBaseUrl = trimTrailingSlash(cleanEnv('HUBTEL_RECEIVE_BASE_URL') || DEFAULT_RECEIVE_BASE_URL);
  const statusBaseUrl = trimTrailingSlash(cleanEnv('HUBTEL_STATUS_BASE_URL') || DEFAULT_STATUS_BASE_URL);
  const timeoutMs = Math.max(3000, Math.min(30000, Number(cleanEnv('HUBTEL_TIMEOUT_MS')) || DEFAULT_TIMEOUT_MS));

  const missing = [];
  if (!clientId) missing.push('HUBTEL_CLIENT_ID');
  if (!clientSecret) missing.push('HUBTEL_CLIENT_SECRET');
  if (!/^\d{1,32}$/.test(accountNumber)) missing.push('HUBTEL_MERCHANT_ACCOUNT_NUMBER');
  if (!callbackUrl()) missing.push('PUBLIC_SERVER_URL (or HUBTEL_CALLBACK_URL)');

  return {
    clientId,
    clientSecret,
    accountNumber,
    receiveBaseUrl,
    statusBaseUrl,
    timeoutMs,
    callbackUrl: callbackUrl(),
    callbackToken: cleanEnv('HUBTEL_CALLBACK_TOKEN'),
    configured: missing.length === 0,
    missing,
  };
}

export function isHubtelConfigured() {
  return getHubtelConfig().configured;
}

export function publicHubtelSettings() {
  const config = getHubtelConfig();
  return {
    method: 'hubtel',
    enabled: config.configured,
    providers: providerPublicList(),
    callbackConfigured: Boolean(config.callbackUrl),
    missing: config.configured ? [] : config.missing,
  };
}

export function adminHubtelSettings() {
  const config = getHubtelConfig();
  return {
    ...publicHubtelSettings(),
    callbackUrl: config.callbackUrl || null,
    webhookSecure: Boolean(config.callbackUrl && config.callbackUrl.startsWith('https://')),
    channels: PAYMENT_PROVIDERS.map(({ id, name, channel }) => ({ id, name, channel })),
  };
}

function authHeader(config) {
  return `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`;
}

function pickField(source, name) {
  if (!source || typeof source !== 'object') return undefined;
  const keys = Object.keys(source).filter((key) => key.toLowerCase() === name.toLowerCase());
  return keys.length === 1 ? source[keys[0]] : undefined;
}

function parseEnvelope(body) {
  const code = String(pickField(body, 'ResponseCode') ?? '').trim();
  const data = pickField(body, 'Data');
  const message =
    pickField(body, 'ResponseMessage') ??
    pickField(body, 'Message') ??
    pickField(data, 'Message') ??
    '';
  return {
    code,
    data: data && typeof data === 'object' && !Array.isArray(data) ? data : {},
    message: String(message || '').trim(),
  };
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

function toGhs(pesewas) {
  return Math.round(Number(pesewas || 0)) / 100;
}

/**
 * Ask Hubtel to prompt the customer's wallet.
 * @returns {Promise<{state:'accepted'|'rejected'|'unknown', transactionId:string|null, code:string, message:string, detail?:string}>}
 */
export async function initiateMobileMoneyPayment({
  orderNumber,
  amountPesewas,
  customerName,
  customerEmail,
  customerPhone,
  provider,
  description,
}) {
  const config = getHubtelConfig();
  if (!config.configured) {
    const error = new Error('Mobile money payments are not configured on this server.');
    error.code = 'PAYMENTS_NOT_CONFIGURED';
    error.status = 503;
    error.details = { missing: config.missing };
    throw error;
  }

  const selected = providerById(provider);
  if (!selected) {
    const error = new Error('Choose the mobile money wallet you will pay from.');
    error.code = 'INVALID_PROVIDER';
    error.status = 400;
    throw error;
  }

  const msisdn = normalizeGhanaMsisdn(customerPhone);
  if (!msisdn) {
    const error = new Error('Enter a valid Ghana mobile money number.');
    error.code = 'INVALID_PAYMENT_PHONE';
    error.status = 400;
    throw error;
  }

  const amount = toGhs(amountPesewas);
  if (!(amount > 0)) {
    const error = new Error('This order does not have a valid total.');
    error.code = 'INVALID_AMOUNT';
    error.status = 400;
    throw error;
  }

  const payload = {
    CustomerName: String(customerName || '').slice(0, 100) || 'NKAY customer',
    CustomerMsisdn: msisdn,
    Channel: selected.channel,
    Amount: amount,
    Description: String(description || `NKAY order ${orderNumber}`).slice(0, 120),
    ClientReference: orderNumber,
    // Hubtel's documentation has used both spellings across API versions.
    // Sending both is harmless and keeps the callback reliable.
    PrimaryCallbackUrl: config.callbackUrl,
    PrimaryCallbackURL: config.callbackUrl,
    SecondaryCallbackUrl: config.callbackUrl,
    SecondaryCallbackURL: config.callbackUrl,
  };
  if (customerEmail) payload.CustomerEmail = String(customerEmail).slice(0, 120);

  const url = `${config.receiveBaseUrl}/merchantaccount/merchants/${config.accountNumber}/receive/mobilemoney`;

  let result;
  try {
    result = await requestJson(
      url,
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
    return {
      state: 'unknown',
      transactionId: null,
      code: 'NETWORK',
      message: 'Hubtel did not answer the payment request.',
    };
  }

  const { response, body } = result;
  const envelope = parseEnvelope(body);

  if (!(response.status >= 200 && response.status < 300)) {
    // Even an HTTP error can hide provider-side acceptance (for example a
    // gateway timeout after Hubtel already prompted the phone). Never invite
    // an automatic retry in that case.
    if (response.status === 400 && REJECTED_CODES.has(envelope.code)) {
      return {
        state: 'rejected',
        transactionId: null,
        code: envelope.code,
        message: PROVIDER_ERRORS[envelope.code] || envelope.message || 'Hubtel declined the payment request.',
      };
    }
    return {
      state: 'unknown',
      transactionId: null,
      code: envelope.code || `HTTP_${response.status}`,
      message: envelope.message || 'Hubtel did not confirm the payment request.',
    };
  }

  const transactionId = String(pickField(envelope.data, 'TransactionId') ?? '').trim() || null;
  const clientReference = String(pickField(envelope.data, 'ClientReference') ?? '').trim();

  if (ACCEPTED_CODES.has(envelope.code)) {
    if (clientReference && clientReference !== orderNumber) {
      return {
        state: 'unknown',
        transactionId,
        code: envelope.code,
        message: 'Hubtel returned a different payment reference.',
      };
    }
    return {
      state: 'accepted',
      transactionId,
      code: envelope.code,
      message: envelope.message || 'Payment prompt sent.',
    };
  }

  if (REJECTED_CODES.has(envelope.code)) {
    return {
      state: 'rejected',
      transactionId: null,
      code: envelope.code,
      message: PROVIDER_ERRORS[envelope.code] || envelope.message || 'Hubtel declined the payment request.',
    };
  }

  return {
    state: 'unknown',
    transactionId,
    code: envelope.code || 'UNKNOWN',
    message: envelope.message || 'Hubtel did not confirm the payment request.',
  };
}

function normalizeStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  if (['paid', 'success', 'successful', 'completed'].includes(status)) return 'paid';
  if (['unpaid', 'pending', 'processing', 'initiated'].includes(status)) return 'pending';
  if (['refunded', 'reversed'].includes(status)) return 'refunded';
  if (['failed', 'failure', 'cancelled', 'canceled', 'declined', 'timeout'].includes(status)) return 'failed';
  return 'unknown';
}

/**
 * Independently verify a persisted payment reference with Hubtel.
 * @returns {Promise<{ok:boolean, state:'paid'|'pending'|'refunded'|'failed'|'unknown'|'unavailable', transactionId?:string|null, amountPesewas?:number|null, currency?:string, paymentMethod?:string, code?:string}>}
 */
export async function checkMobileMoneyStatus({ reference, transactionId }) {
  const config = getHubtelConfig();
  if (!config.configured) {
    return { ok: false, state: 'unavailable', reason: 'not_configured' };
  }
  const clientReference = String(reference || '').trim();
  if (!clientReference) {
    return { ok: false, state: 'unavailable', reason: 'missing_reference' };
  }

  const url = new URL(`${config.statusBaseUrl}/transactions/${config.accountNumber}/status`);
  url.searchParams.set('clientReference', clientReference);

  let result;
  try {
    result = await requestJson(
      url.toString(),
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
  if (!(response.status >= 200 && response.status < 300)) {
    return { ok: false, state: 'unavailable', reason: `http_${response.status}` };
  }

  const envelope = parseEnvelope(body);
  if (!['0000', 'success'].includes(envelope.code.toLowerCase())) {
    // Not a final state yet; keep the order in progress instead of failing it.
    return { ok: true, state: 'pending', code: envelope.code || 'PENDING' };
  }

  const returnedReference = String(pickField(envelope.data, 'ClientReference') ?? '').trim();
  if (returnedReference && returnedReference !== clientReference) {
    return { ok: false, state: 'mismatch', reason: 'reference_mismatch' };
  }

  const returnedTransactionId = String(pickField(envelope.data, 'TransactionId') ?? '').trim() || null;
  if (transactionId && returnedTransactionId && returnedTransactionId !== transactionId) {
    return { ok: false, state: 'mismatch', reason: 'transaction_mismatch' };
  }

  const rawAmount = pickField(envelope.data, 'Amount');
  const amountPesewas = rawAmount === undefined || rawAmount === null || rawAmount === ''
    ? null
    : Math.round(Number(rawAmount) * 100);
  if (amountPesewas !== null && !Number.isFinite(amountPesewas)) {
    return { ok: false, state: 'mismatch', reason: 'invalid_amount' };
  }

  return {
    ok: true,
    state: normalizeStatus(pickField(envelope.data, 'Status')),
    transactionId: returnedTransactionId,
    amountPesewas,
    currency: String(pickField(envelope.data, 'CurrencyCode') ?? '').trim().toUpperCase(),
    paymentMethod: String(pickField(envelope.data, 'PaymentMethod') ?? '').trim(),
    code: envelope.code,
  };
}

export function callbackReference(body) {
  if (!body || typeof body !== 'object') return '';
  const data = pickField(body, 'Data');
  return String(
    pickField(data, 'ClientReference') ??
      pickField(body, 'ClientReference') ??
      ''
  ).trim();
}
