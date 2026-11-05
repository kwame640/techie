/**
 * End-to-end MTN MoMo flow against a local stub of the collections API.
 *
 * Starts a stub that mimics:
 *   POST /collection/token
 *   POST /collection/v1_0/requesttopay
 *   GET  /collection/v1_0/requesttopay/{referenceId}
 *
 * Then starts the real NKAY server pointed at the stub and exercises:
 *   create order -> send prompt -> pending -> paid (stock once)
 *   duplicate verify -> still paid, stock unchanged
 *   unsigned callback -> status query -> paid
 *   amount mismatch -> attention, stock unchanged
 *
 * Run with: node tests/momo-payment-flow.js
 */
import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const STUB_PORT = 4317;
const APP_PORT = 3317;
const BASE = `http://127.0.0.1:${APP_PORT}`;
const DATA_DIR = path.join(ROOT, 'server', 'models', 'data');
const ORDERS_PATH = path.join(DATA_DIR, 'orders.json');
const STOCK_PATH = path.join(DATA_DIR, 'stock.json');

let failures = 0;
function check(label, condition, detail) {
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${label}${detail === undefined ? '' : ` — ${JSON.stringify(detail)}`}`);
  }
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return fallback;
  }
}

function restore(file, original) {
  if (original === null) {
    try {
      fs.unlinkSync(file);
    } catch {
      /* already gone */
    }
    return;
  }
  fs.writeFileSync(file, original);
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method: options.method || 'GET',
    headers: options.body ? { 'Content-Type': 'application/json', ...(options.headers || {}) } : options.headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

async function waitForServer() {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/api/health`);
      if (response.ok) return;
    } catch {
      /* not listening yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Server did not start');
}

// ---------------------------------------------------------------------------
// MTN stub
// ---------------------------------------------------------------------------
let providerStatus = 'PENDING';
let amountOverride = null;
let currencyOverride = null;
let lastRequest = null;

const stub = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
  });
  req.on('end', () => {
    const url = new URL(req.url, `http://127.0.0.1:${STUB_PORT}`);
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(body === undefined ? '' : JSON.stringify(body));
    };

    if (req.method === 'POST' && url.pathname === '/collection/token') {
      return send(200, { access_token: 'stub-token', expires_in: 3600 });
    }

    if (req.method === 'POST' && url.pathname === '/collection/v1_0/requesttopay') {
      lastRequest = {
        referenceId: String(req.headers['x-reference-id'] || ''),
        targetEnvironment: String(req.headers['x-target-environment'] || ''),
        callbackUrl: String(req.headers['x-callback-url'] || ''),
        body: JSON.parse(raw || '{}'),
      };
      if (!lastRequest.referenceId) return send(400, { message: 'missing X-Reference-Id' });
      return send(202, undefined);
    }

    const match = url.pathname.match(/^\/collection\/v1_0\/requesttopay\/(.+)$/);
    if (req.method === 'GET' && match) {
      if (!lastRequest) return send(404, { message: 'unknown reference' });
      return send(200, {
        amount: amountOverride ?? lastRequest.body.amount,
        currency: currencyOverride ?? lastRequest.body.currency,
        financialTransactionId: 'mtn-tx-1',
        externalId: lastRequest.body.externalId,
        payer: lastRequest.body.payer,
        status: providerStatus,
      });
    }

    return send(404, { message: 'not found' });
  });
});

const ordersBackup = fs.existsSync(ORDERS_PATH) ? fs.readFileSync(ORDERS_PATH, 'utf-8') : null;
const stockBackup = fs.existsSync(STOCK_PATH) ? fs.readFileSync(STOCK_PATH, 'utf-8') : null;

const server = spawn(process.execPath, ['server/index.js'], {
  cwd: ROOT,
  env: {
    ...process.env,
    PORT: String(APP_PORT),
    MOMO_ENV: 'sandbox',
    MOMO_BASE_URL: `http://127.0.0.1:${STUB_PORT}`,
    MOMO_SUBSCRIPTION_KEY: 'stub-subscription-key',
    MOMO_USER_ID: 'stub-api-user',
    MOMO_API_KEY: 'stub-api-key',
    MOMO_TARGET_ENVIRONMENT: 'sandbox',
    MOMO_CURRENCY: 'GHS',
    MOMO_CALLBACK_URL: 'https://nkay.test/api/payments/momo/callback',
    PUBLIC_APP_URL: BASE,
    PUBLIC_SERVER_URL: BASE,
    FIREBASE_PROJECT_ID: '',
    FIREBASE_CLIENT_EMAIL: '',
    FIREBASE_PRIVATE_KEY: '',
    VERCEL: '',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverLog = '';
server.stdout.on('data', (chunk) => {
  serverLog += chunk;
});
server.stderr.on('data', (chunk) => {
  serverLog += chunk;
});

async function main() {
  await new Promise((resolve) => stub.listen(STUB_PORT, '127.0.0.1', resolve));
  await waitForServer();

  console.log('health & settings');
  const health = await request('/api/health');
  check('health reports mtn_momo', health.body?.payments?.method === 'mtn_momo', health.body);
  check('health reports configured', health.body?.payments?.configured === true, health.body);
  check('local storage fallback', health.body?.storage?.mode === 'local-json', health.body);
  check(
    'callback URL is published',
    health.body?.payments?.callbackConfigured === true,
    health.body
  );

  const settings = await request('/api/payments/settings');
  check('public settings enabled', settings.body?.settings?.enabled === true, settings.body);
  check('public settings method', settings.body?.settings?.method === 'mtn_momo', settings.body);

  const stockBefore = readJson(STOCK_PATH, {});
  const catalogue = readJson(path.join(ROOT, 'server', 'data', 'catalogue.json'), { products: [] });
  const product = catalogue.products.find((item) => item.id === 'prod-1');
  const startingStock = Number.isInteger(stockBefore['prod-1']) ? stockBefore['prod-1'] : product.stock;

  const createOrder = async (suffix) => {
    const response = await request('/api/orders', {
      method: 'POST',
      body: {
        items: [{ productId: 'prod-1', quantity: 1 }],
        deliveryMethod: 'pickup',
        customer: { name: 'Ama Mensah', phone: '0551234567', email: 'ama@example.com' },
        delivery: { method: 'pickup' },
        idempotencyKey: `momo-test-${suffix}-${Date.now()}`,
      },
    });
    check(`create order ${suffix}`, response.status === 201 && response.body?.order?.paymentStatus === 'pending', response.body);
    return response.body.order;
  };

  console.log('\npayment request');
  const order = await createOrder('happy');
  check('order total is GHS 2500', order.total === 2500, order.total);

  const pay = await request(`/api/orders/${order.id}/pay`, { method: 'POST' });
  check('pay returns 201 processing', pay.status === 201 && pay.body?.state === 'processing', pay.body);
  check('phone normalised to 233', pay.body?.paymentPhone === '233551234567', pay.body);
  check('reference id is a UUID', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lastRequest.referenceId), lastRequest);
  check('target environment header', lastRequest.targetEnvironment === 'sandbox', lastRequest);
  check('callback header sent', lastRequest.callbackUrl === 'https://nkay.test/api/payments/momo/callback', lastRequest);
  check('amount sent in GHS units', lastRequest.body.amount === '2500.00', lastRequest.body);
  check('currency sent', lastRequest.body.currency === 'GHS', lastRequest.body);
  check('external reference matches order', lastRequest.body.externalId === pay.body.order.paymentReference, lastRequest.body);

  console.log('\npending then paid');
  providerStatus = 'PENDING';
  const pending = await request(`/api/orders/${order.id}/payment/verify`, { method: 'POST' });
  check('pending state kept', pending.body?.state === 'pending' && pending.body?.order?.paymentStatus === 'processing', pending.body);

  providerStatus = 'SUCCESSFUL';
  const paid = await request(`/api/orders/${order.id}/payment/verify`, { method: 'POST' });
  check('verified paid', paid.body?.state === 'paid' && paid.body?.order?.paymentStatus === 'paid', paid.body);
  check('amount paid recorded', paid.body?.order?.amountPaid === 2500, paid.body?.order?.amountPaid);
  check('MTN transaction id stored', paid.body?.order?.paymentTransactionId === 'mtn-tx-1', paid.body?.order?.paymentTransactionId);

  const afterPaidStock = readJson(STOCK_PATH, {})['prod-1'];
  check('stock decremented once', afterPaidStock === startingStock - 1, { startingStock, afterPaidStock });

  const repeatPaid = await request(`/api/orders/${order.id}/payment/verify`, { method: 'POST' });
  const afterRepeatStock = readJson(STOCK_PATH, {})['prod-1'];
  check('repeat verify still paid', repeatPaid.body?.state === 'paid', repeatPaid.body);
  check('repeat verify leaves stock alone', afterRepeatStock === afterPaidStock, { afterPaidStock, afterRepeatStock });

  console.log('\nunsigned callback');
  const callbackOrder = await createOrder('callback');
  const callbackPay = await request(`/api/orders/${callbackOrder.id}/pay`, { method: 'POST' });
  check('second prompt sent', callbackPay.status === 201, callbackPay.body);
  providerStatus = 'SUCCESSFUL';
  const callback = await request('/api/payments/momo/callback', {
    method: 'POST',
    body: { referenceId: 'unknown-reference', externalId: callbackPay.body.order.paymentReference },
  });
  check('callback result paid', callback.body?.state === 'paid', callback.body);
  const callbackStock = readJson(STOCK_PATH, {})['prod-1'];
  check('callback decremented stock once', callbackStock === afterRepeatStock - 1, {
    afterRepeatStock,
    callbackStock,
  });

  const unknownCallback = await request('/api/payments/momo/callback', {
    method: 'POST',
    body: { referenceId: 'not-a-real-reference', externalId: 'not-a-real-order' },
  });
  check('unknown callback ignored', unknownCallback.status === 200 && unknownCallback.body?.ignored === true, unknownCallback.body);

  console.log('\namount mismatch');
  const mismatchOrder = await createOrder('mismatch');
  const mismatchPay = await request(`/api/orders/${mismatchOrder.id}/pay`, { method: 'POST' });
  check('mismatch prompt sent', mismatchPay.status === 201, mismatchPay.body);
  providerStatus = 'SUCCESSFUL';
  amountOverride = '1.00';
  const mismatch = await request(`/api/orders/${mismatchOrder.id}/payment/verify`, { method: 'POST' });
  check('mismatch moves to attention', mismatch.body?.state === 'attention' && mismatch.body?.order?.paymentStatus === 'attention', mismatch.body);
  const mismatchStock = readJson(STOCK_PATH, {})['prod-1'];
  check('mismatch does not decrement stock', mismatchStock === callbackStock, { callbackStock, mismatchStock });

  console.log('\nsecret exposure');
  const missing = await request('/api/payments/settings');
  check('settings never expose secrets', !JSON.stringify(missing.body).includes('stub-api-key'), missing.body);
}

main()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(() => {
    server.kill();
    stub.close();
    restore(ORDERS_PATH, ordersBackup);
    restore(STOCK_PATH, stockBackup);
    if (serverLog && failures) {
      console.log('\nserver log:\n' + serverLog.slice(-4000));
    }
    console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
    process.exitCode = failures ? 1 : 0;
  });
