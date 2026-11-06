/**
 * MTN Mobile Money (MoMo) Collections API client for Ghana.
 *
 * Contract (https://momodeveloper.mtn.com):
 *   1. POST /collection/token                      -> { access_token, expires_in }
 *   2. POST /collection/v1_0/requesttopay          -> 202 Accepted (no body)
 *      X-Reference-Id: a UUID we generate and persist before the call
 *   3. Customer approves the PIN prompt on their phone.
 *   4. GET  /collection/v1_0/requesttopay/{id}     -> { status, amount, ... }
 *
 * Unlike a hosted checkout there is no redirect: MTN pushes a prompt straight
 * to the customer's handset. The browser cannot see the result, so the ONLY
 * authoritative paid check is the status endpoint. MTN callbacks are
 * unsigned, so a callback is treated as a hint that tells us to query.
 *
 * `status` values are PENDING, SUCCESSFUL and FAILED. The request is
 * idempotent on X-Reference-Id: reusing the same UUID never charges twice.
 *
 * Sandbox uses https://sandbox.momodeveloper.mtn.com, X-Target-Environment
 * `sandbox`, and (per MTN) EUR. Live uses the new One API host
 * https://momoapi.momo.africa, X-Target-Environment `mtnghana`, and GHS.
 * Ghana was still migrating to the One API host at the time of writing; set
 * MOMO_BASE_URL to the host MTN gives you if your account still uses the old
 * https://proxy.momoapi.mtn.com endpoint.
 */

const SANDBOX_BASE_URL = 'https://sandbox.momodeveloper.mtn.com';
const PRODUCTION_BASE_URL = 'https://momoapi.momo.africa';
const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_PROMPT_MINUTES = 10;

function credentialMessage(config, httpStatus) {
  const where = `${config.mode} mode (${config.targetEnvironment} @ ${config.baseUrl})`;
  if (httpStatus === 401) {
    return (
      `MTN rejected the API user or API key (401, ${where}). ` +
      'MOMO_USER_ID must be the exact X-Reference-Id used to create the API user, and ' +
      'MOMO_API_KEY must be the key returned for that same user in this environment.'
    );
  }
  if (httpStatus === 403) {
    return (
      `MTN rejected the subscription key (403, ${where}). Use the primary key from the ` +
      '"Collections" product in the same MTN environment as the API user (sandbox keys ' +
      'do not work in live, and live keys do not work in sandbox).'
    );
  }
  if (httpStatus === 400) {
    return (
      `MTN rejected the credential format (400, ${where}). Check MOMO_USER_ID, ` +
      'MOMO_API_KEY and MOMO_SUBSCRIPTION_KEY for spaces, quotes or line breaks.'
    );
  }
  return (
    `MTN rejected the MoMo API credentials (${httpStatus}, ${where}). Check MOMO_USER_ID, ` +
    'MOMO_API_KEY and MOMO_SUBSCRIPTION_KEY, and make sure MOMO_ENV matches the credentials ' +
    '(sandbox vs live).'
  );
}

function cleanEnv(name) {
  let value = String(process.env[name] || '').trim();
  // Vercel/dashboard users sometimes paste values with surrounding quotes.
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
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

function isSandboxEnv() {
  const value = cleanEnv('MOMO_ENV').toLowerCase();
  return (
    value === 'sandbox' ||
    value === 'test' ||
    ['1', 'true', 'yes'].includes(cleanEnv('MOMO_SANDBOX').toLowerCase())
  );
}

function resolveBaseUrl() {
  const explicit = trimTrailingSlash(cleanEnv('MOMO_BASE_URL'));
  if (explicit) return explicit;
  return isSandboxEnv() ? SANDBOX_BASE_URL : PRODUCTION_BASE_URL;
}

function callbackUrl() {
  const explicit = cleanEnv('MOMO_CALLBACK_URL');
  if (explicit) return explicit;
  const base = serverBaseUrl();
  return base ? `${base}/api/payments/momo/callback` : '';
}

function callbackHost(value) {
  try {
    return new URL(value).host;
  } catch {
    return '';
  }
}

function resolveTargetEnvironment() {
  const explicit = cleanEnv('MOMO_TARGET_ENVIRONMENT');
  if (explicit) return explicit;
  return isSandboxEnv() ? 'sandbox' : 'mtnghana';
}

function resolveCurrency() {
  const explicit = cleanEnv('MOMO_CURRENCY');
  if (explicit) return explicit.toUpperCase();
  // MTN's sandbox only settles in EUR; production Ghana settles in GHS.
  return isSandboxEnv() ? 'EUR' : 'GHS';
}

export function getMoMoConfig() {
  const subscriptionKey = cleanEnv('MOMO_SUBSCRIPTION_KEY');
  const userId = cleanEnv('MOMO_USER_ID') || cleanEnv('MOMO_API_USER');
  const apiKey = cleanEnv('MOMO_API_KEY') || cleanEnv('MOMO_CREDENTIAL_TOKEN');
  const baseUrl = resolveBaseUrl();
  const targetEnvironment = resolveTargetEnvironment();
  const currency = resolveCurrency();
  const timeoutMs = Math.max(
    3000,
    Math.min(30000, Number(cleanEnv('MOMO_TIMEOUT_MS')) || DEFAULT_TIMEOUT_MS)
  );
  const promptMinutes = Math.max(
    5,
    Math.min(120, Number(cleanEnv('MOMO_PROMPT_MINUTES')) || DEFAULT_PROMPT_MINUTES)
  );
  const callback = callbackUrl();

  const missing = [];
  if (!subscriptionKey) missing.push('MOMO_SUBSCRIPTION_KEY');
  if (!userId) missing.push('MOMO_USER_ID');
  if (!apiKey) missing.push('MOMO_API_KEY');

  return {
    subscriptionKey,
    userId,
    apiKey,
    baseUrl,
    targetEnvironment,
    currency,
    timeoutMs,
    promptMinutes,
    appUrl: appBaseUrl(),
    callbackUrl: callback,
    callbackHost: callbackHost(callback),
    configured: missing.length === 0,
    callbackConfigured: Boolean(callback && callback.startsWith('https://')),
    missing,
    mode: isSandboxEnv() ? 'sandbox' : 'live',
  };
}

export function isMoMoConfigured() {
  return getMoMoConfig().configured;
}

export function publicMoMoSettings() {
  const config = getMoMoConfig();
  return {
    method: 'mtn_momo',
    providerName: 'MTN Mobile Money',
    enabled: config.configured,
    mode: config.mode,
    targetEnvironment: config.targetEnvironment,
    currency: config.currency,
    callbackConfigured: config.callbackConfigured,
    missing: config.configured ? [] : config.missing,
  };
}

export function adminMoMoSettings() {
  const config = getMoMoConfig();
  return {
    ...publicMoMoSettings(),
    mode: config.mode,
    targetEnvironment: config.targetEnvironment,
    currency: config.currency,
    subscriptionKeySet: Boolean(config.subscriptionKey),
    userIdSet: Boolean(config.userId),
    apiKeySet: Boolean(config.apiKey),
    apiBaseUrl: config.baseUrl,
    callbackUrl: config.callbackUrl || null,
    callbackHost: config.callbackHost || null,
    callbackSecure: Boolean(config.callbackUrl && config.callbackUrl.startsWith('https://')),
    promptMinutes: config.promptMinutes,
  };
}

export function toMsisdn(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('233') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `233${digits.slice(1)}`;
  if (digits.length === 9) return `233${digits}`;
  return digits;
}

function toAmountString(pesewas) {
  return (Math.round(Number(pesewas || 0)) / 100).toFixed(2);
}

function providerError(message, code, details) {
  const error = new Error(message);
  error.status = 502;
  error.code = code;
  error.details = details;
  return error;
}

function messageFromBody(body, fallback) {
  if (!body || typeof body !== 'object') return fallback;
  const detail = body.error_description || body.errorMessage || body.error_message;
  const base = String(body.message || body.error || body.code || '');
  if (detail && base && !String(detail).includes(base)) return `${base}: ${detail}`;
  return String(detail || base || fallback);
}

function trimReason(value, max = 200) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

async function rawRequest(url, { method = 'GET', headers = {}, body, timeoutMs } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method, headers, body, signal: controller.signal });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { response, text, json };
  } finally {
    clearTimeout(timer);
  }
}

// Access tokens live for an hour. Caching avoids a token round-trip per poll.
const tokenCache = new Map();

function cacheKey(config) {
  return `${config.baseUrl}|${config.targetEnvironment}|${config.userId}|${config.apiKey}`;
}

function invalidateAccessToken(config) {
  tokenCache.delete(cacheKey(config));
}

async function createAccessToken(config) {
  const basic = Buffer.from(`${config.userId}:${config.apiKey}`).toString('base64');
  let result;
  try {
    result = await rawRequest(`${config.baseUrl}/collection/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Ocp-Apim-Subscription-Key': config.subscriptionKey,
        'X-Target-Environment': config.targetEnvironment,
        Accept: 'application/json',
      },
      timeoutMs: config.timeoutMs,
    });
  } catch {
    throw providerError(
      'MTN Mobile Money did not answer the token request. Please try again.',
      'PAYMENT_PROVIDER_UNREACHABLE'
    );
  }

  const status = result.response.status;
  if (!(status >= 200 && status < 300) || !result.json?.access_token) {
    const reason = trimReason(
      messageFromBody(result.json, trimReason(result.text, 200) || 'no response body')
    );
    console.error('[momo] token request failed', {
      status,
      reason,
      mode: config.mode,
      targetEnvironment: config.targetEnvironment,
      baseUrl: config.baseUrl,
    });
    if ([400, 401, 403].includes(status)) {
      throw providerError(credentialMessage(config, status), 'PAYMENT_CREDENTIALS_REJECTED', {
        httpStatus: status,
        reason,
      });
    }
    if (!(status >= 200 && status < 300)) {
      throw providerError(
        `MTN could not issue an access token (HTTP ${status}${reason ? `: ${reason}` : ''}). ` +
          'Check the MoMo subscription key, API user and API key for this environment.',
        'PAYMENT_TOKEN_FAILED',
        { httpStatus: status, reason }
      );
    }
    throw providerError(
      'MTN answered the token request without an access token. Check the MoMo subscription key and API user.',
      'PAYMENT_TOKEN_FAILED',
      { httpStatus: status, reason }
    );
  }

  return {
    token: String(result.json.access_token),
    expiresIn: Number(result.json.expires_in) || 3600,
  };
}

async function getAccessToken(config) {
  const key = cacheKey(config);
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const created = await createAccessToken(config);
  tokenCache.set(key, {
    token: created.token,
    expiresAt: Date.now() + created.expiresIn * 1000,
  });
  return created.token;
}

async function authorizedRequest(config, path, { method = 'GET', headers = {}, body } = {}) {
  const send = (token) =>
    rawRequest(`${config.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Ocp-Apim-Subscription-Key': config.subscriptionKey,
        'X-Target-Environment': config.targetEnvironment,
        Accept: 'application/json',
        ...headers,
      },
      body,
      timeoutMs: config.timeoutMs,
    });

  let token = await getAccessToken(config);
  let result;
  try {
    result = await send(token);
  } catch {
    throw providerError(
      'MTN Mobile Money did not answer the payment request. Please try again.',
      'PAYMENT_PROVIDER_UNREACHABLE'
    );
  }

  if (result.response.status === 401) {
    invalidateAccessToken(config);
    token = await getAccessToken(config);
    try {
      result = await send(token);
    } catch {
      throw providerError(
        'MTN Mobile Money did not answer the payment request. Please try again.',
        'PAYMENT_PROVIDER_UNREACHABLE'
      );
    }
  }
  return result;
}

/**
 * Sends a RequestToPay prompt to the customer's MTN wallet.
 *
 * `referenceId` must be generated and persisted by the caller BEFORE this
 * function runs. MTN treats it as the idempotency key, so a retry that reuses
 * it can never charge the customer twice.
 *
 * @returns {Promise<{ referenceId: string, orderReference: string, currency: string, amountPesewas: number }>}
 */
export async function createRequestToPay({
  referenceId,
  orderReference,
  amountPesewas,
  currency,
  customerPhone,
  orderNumber,
  description,
}) {
  const config = getMoMoConfig();
  if (!config.configured) {
    const error = new Error('Mobile money payments are not configured on this server.');
    error.code = 'PAYMENTS_NOT_CONFIGURED';
    error.status = 503;
    error.details = { missing: config.missing };
    throw error;
  }

  const reference = String(referenceId || '').trim();
  if (!reference) {
    throw providerError('A payment reference is required.', 'INVALID_PAYMENT_REFERENCE');
  }

  const reference2 = String(orderReference || '').trim();
  if (!reference2) {
    throw providerError('An order reference is required.', 'INVALID_PAYMENT_REFERENCE');
  }

  const amount = toAmountString(amountPesewas);
  if (!(Number(amount) > 0)) {
    throw providerError('This order does not have a valid total.', 'INVALID_AMOUNT');
  }

  const msisdn = toMsisdn(customerPhone);
  if (!/^233\d{9}$/.test(msisdn)) {
    throw providerError(
      'Enter a valid Ghana MTN MoMo number before paying.',
      'INVALID_PAYMENT_PHONE',
      { phone: customerPhone }
    );
  }

  const payload = {
    amount,
    currency: String(currency || config.currency || 'GHS').toUpperCase(),
    externalId: reference2,
    payer: {
      partyIdType: 'MSISDN',
      partyId: msisdn,
    },
    payerMessage: String(description || `NKAY order ${orderNumber || ''}`).slice(0, 160),
    payeeNote: String(description || `NKAY order ${orderNumber || ''}`).slice(0, 160),
  };

  const headers = {
    'Content-Type': 'application/json',
    'X-Reference-Id': reference,
  };
  if (config.callbackUrl && config.callbackConfigured) {
    headers['X-Callback-Url'] = config.callbackUrl;
  }

  let result;
  try {
    result = await authorizedRequest(config, '/collection/v1_0/requesttopay', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error.code) throw error;
    throw providerError(
      'MTN Mobile Money did not answer the payment request. Please try again.',
      'PAYMENT_PROVIDER_UNREACHABLE'
    );
  }

  const status = result.response.status;
  if (!(status >= 200 && status < 300)) {
    if ([401, 403].includes(status)) {
      throw providerError(credentialMessage(config, status), 'PAYMENT_CREDENTIALS_REJECTED', { httpStatus: status });
    }
    if (status === 409) {
      throw providerError(
        'MTN says this payment reference is already in use. Please start a new payment.',
        'PAYMENT_DUPLICATE_REFERENCE',
        { httpStatus: status }
      );
    }
    if (status >= 500) {
      throw providerError(
        'MTN Mobile Money is temporarily unavailable. Please try again.',
        'PAYMENT_PROVIDER_ERROR',
        { httpStatus: status }
      );
    }
    const reason = trimReason(
      messageFromBody(result.json, 'MTN rejected the payment request. Please check the order details.')
    );
    console.error('[momo] requesttopay rejected', {
      status,
      reason,
      mode: config.mode,
      targetEnvironment: config.targetEnvironment,
      baseUrl: config.baseUrl,
    });
    throw providerError(
      `MTN rejected the payment request (HTTP ${status}${reason ? `: ${reason}` : ''}).`,
      'PAYMENT_REQUEST_REJECTED',
      { httpStatus: status, providerStatus: trimReason(result.text, 300) }
    );
  }

  return {
    referenceId: reference,
    orderReference: reference2,
    currency: payload.currency,
    amountPesewas: Math.round(Number(amount) * 100),
    payerPhone: msisdn,
  };
}

function reasonText(body) {
  const reason = body?.reason;
  if (!reason) return '';
  if (typeof reason === 'string') return reason.trim();
  return String(reason.message || reason.code || '').trim();
}

function normalizeStatus(body, referenceId) {
  const raw = String(body?.status || '').toUpperCase();
  let state = 'unknown';
  if (raw === 'SUCCESSFUL') state = 'paid';
  else if (raw === 'FAILED') state = 'failed';
  else if (raw === 'PENDING') state = 'pending';

  const amountRaw = body?.amount;
  const parsedAmount = Number(amountRaw);
  const amountPesewas =
    amountRaw === undefined || amountRaw === null || amountRaw === ''
      ? null
      : Number.isFinite(parsedAmount)
        ? Math.round(parsedAmount * 100)
        : null;

  return {
    ok: true,
    providerStatus: raw || null,
    state,
    resultText: reasonText(body) || raw,
    orderReference: String(body?.externalId || '').trim(),
    transactionId:
      String(body?.financialTransactionId || body?.financialTransactionID || '').trim() || null,
    token: String(body?.referenceId || referenceId || '').trim() || null,
    amountPesewas,
    currency: String(body?.currency || '').toUpperCase(),
    paymentMethod: 'mtn_momo',
    payerPhone: String(body?.payer?.partyId || '').trim() || null,
    dateProcessed: String(body?.dateProcessed || body?.date || '').trim() || null,
  };
}

/**
 * Authoritative payment status lookup. Never trust a callback body instead.
 */
export async function queryTransaction(referenceId) {
  const config = getMoMoConfig();
  if (!config.configured) {
    return { ok: false, state: 'unavailable', reason: 'not_configured' };
  }
  const value = String(referenceId || '').trim();
  if (!value) {
    return { ok: false, state: 'unavailable', reason: 'missing_reference' };
  }

  let result;
  try {
    result = await authorizedRequest(
      config,
      `/collection/v1_0/requesttopay/${encodeURIComponent(value)}`
    );
  } catch (error) {
    if (error.code === 'PAYMENT_CREDENTIALS_REJECTED') {
      return { ok: false, state: 'unavailable', reason: 'credentials' };
    }
    return { ok: false, state: 'unavailable', reason: 'network' };
  }

  const status = result.response.status;
  if (status === 404) {
    return { ok: false, state: 'unavailable', reason: 'not_found' };
  }
  if ([401, 403].includes(status)) {
    return { ok: false, state: 'unavailable', reason: 'credentials' };
  }
  if (!(status >= 200 && status < 300) || !result.json || !result.json.status) {
    return { ok: false, state: 'unavailable', reason: `http_${status}` };
  }

  return normalizeStatus(result.json, value);
}

function maskSecret(value) {
  const text = String(value || '');
  if (!text) return '(empty)';
  if (text.length <= 8) return `${text.slice(0, 2)}… (${text.length} chars)`;
  return `${text.slice(0, 4)}…${text.slice(-2)} (${text.length} chars)`;
}

/**
 * Masked credential check used by the protected diagnostic route. It never
 * returns secret values, and it performs a real token request so the operator
 * can see MTN's exact HTTP status and reason.
 */
export async function diagnoseMoMoCredentials() {
  const config = getMoMoConfig();
  const problems = [];
  if (!config.subscriptionKey) problems.push('MOMO_SUBSCRIPTION_KEY is empty');
  if (!config.userId) problems.push('MOMO_USER_ID is empty');
  if (!config.apiKey) problems.push('MOMO_API_KEY is empty');
  if (/\s/.test(config.subscriptionKey) || /\s/.test(config.userId) || /\s/.test(config.apiKey)) {
    problems.push('One of the credentials still contains whitespace');
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(config.userId)) {
    problems.push('MOMO_USER_ID is not a UUID (it must be the X-Reference-Id used to create the API user)');
  }
  if (config.mode === 'sandbox' && config.targetEnvironment !== 'sandbox') {
    problems.push('MOMO_ENV=sandbox but MOMO_TARGET_ENVIRONMENT is not "sandbox"');
  }
  if (config.mode === 'live' && config.targetEnvironment === 'sandbox') {
    problems.push('MOMO_ENV=live but MOMO_TARGET_ENVIRONMENT is "sandbox"');
  }
  if (config.mode === 'sandbox' && !config.baseUrl.includes('sandbox.momodeveloper.mtn.com')) {
    problems.push('MOMO_ENV=sandbox but the API host is not the sandbox host');
  }

  const result = {
    mode: config.mode,
    targetEnvironment: config.targetEnvironment,
    currency: config.currency,
    baseUrl: config.baseUrl,
    callbackConfigured: config.callbackConfigured,
    subscriptionKey: maskSecret(config.subscriptionKey),
    userId: maskSecret(config.userId),
    apiKey: maskSecret(config.apiKey),
    problems,
    token: null,
  };

  if (!config.configured) {
    result.token = { ok: false, status: 0, reason: 'credentials missing' };
    return result;
  }

  const basic = Buffer.from(`${config.userId}:${config.apiKey}`).toString('base64');

  const fakeBasic = Buffer.from(
    '00000000-0000-4000-8000-000000000000:fake'
  ).toString('base64');

  const probe = async (
    extraHeaders = {},
    { host = config.baseUrl, basicAuth = basic, subscriptionKey = config.subscriptionKey } = {}
  ) => {
    try {
      const response = await rawRequest(`${host}/collection/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Ocp-Apim-Subscription-Key': subscriptionKey,
          'X-Target-Environment': config.targetEnvironment,
          Accept: 'application/json',
          ...extraHeaders,
        },
        timeoutMs: config.timeoutMs,
      });
      const status = response.response.status;
      const hasToken = Boolean(response.json?.access_token);
      return {
        ok: status >= 200 && status < 300 && hasToken,
        status,
        reason: trimReason(
          messageFromBody(response.json, trimReason(response.text, 200) || 'no response body')
        ),
        expiresIn: Number(response.json?.expires_in) || null,
      };
    } catch (error) {
      return { ok: false, status: 0, reason: `network: ${error.message}` };
    }
  };

  const browserUa =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
  const variants = [
    ['default', {}],
    ['browser-ua', { 'User-Agent': browserUa }],
    ['empty-body', { 'Content-Length': '0' }],
    ['browser-ua+empty-body', { 'User-Agent': browserUa, 'Content-Length': '0' }],
  ];

  result.attempts = [];
  for (const [label, extra] of variants) {
    const attempt = await probe(extra);
    result.attempts.push({ label, ...attempt });
    if (!result.token || (attempt.ok && !result.token.ok)) {
      result.token = attempt;
    }
    if (attempt.ok) break;
  }

  // Is the firewall rejecting every request from this host, or only requests
  // that carry the real credentials? Fake values make the distinction.
  const fake = await probe(
    {},
    { basicAuth: fakeBasic, subscriptionKey: 'fake-subscription-key' }
  );
  result.attempts.push({ label: 'fake-credentials', ...fake });

  // Split the real values to find which one trips the firewall.
  const realKeyOnly = await probe(
    {},
    { basicAuth: fakeBasic, subscriptionKey: config.subscriptionKey }
  );
  result.attempts.push({ label: 'real-subscription-key-only', ...realKeyOnly });

  const realBasicOnly = await probe(
    {},
    { basicAuth: basic, subscriptionKey: 'fake-subscription-key' }
  );
  result.attempts.push({ label: 'real-basic-only', ...realBasicOnly });

  if (config.mode === 'sandbox') {
    for (const host of ['https://sandbox.momoapi.mtn.com']) {
      const alternate = await probe(
        {},
        { host, basicAuth: fakeBasic, subscriptionKey: 'fake-subscription-key' }
      );
      result.attempts.push({ label: `fake-credentials @ ${host}`, ...alternate });
    }
  }

  if (result.token?.status === 401) {
    result.token.hint =
      'MOMO_USER_ID must be the X-Reference-Id used to create the API user, and MOMO_API_KEY the key returned for that user in this environment.';
  } else if (result.token?.status === 403) {
    result.token.hint = 'MOMO_SUBSCRIPTION_KEY must be the primary key of the Collections product.';
  } else if (result.token?.status === 404) {
    result.token.hint =
      'Wrong host or path. Sandbox host is https://sandbox.momodeveloper.mtn.com and the token path is /collection/token.';
  } else if (
    result.attempts.every((attempt) => !attempt.ok) &&
    /request rejected|support id/i.test(result.attempts[0]?.reason || '')
  ) {
    result.token.hint =
      'MTN’s firewall rejected the request from this server (not a credential error). This usually means MTN blocks the hosting IP range or the server user agent.';
  }

  return result;
}

export { credentialMessage };
