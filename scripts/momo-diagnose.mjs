/**
 * Diagnoses MTN MoMo credentials without exposing them.
 *
 * Uses the same environment variables as the server (.env or shell env):
 *   MOMO_ENV, MOMO_TARGET_ENVIRONMENT, MOMO_CURRENCY, MOMO_BASE_URL,
 *   MOMO_SUBSCRIPTION_KEY, MOMO_USER_ID, MOMO_API_KEY
 *
 * Steps:
 *   1. prints the resolved configuration (secrets masked)
 *   2. requests a Collections access token
 *   3. if MOMO_TEST_MSISDN is set, sends a real RequestToPay prompt and polls once
 *
 * Run:
 *   npm run momo:diagnose
 *   MOMO_TEST_MSISDN=233551234567 MOMO_TEST_AMOUNT=1.00 npm run momo:diagnose
 */
import 'dotenv/config';
import { randomUUID } from 'crypto';
import { getMoMoConfig, toMsisdn } from '../server/services/momoService.js';

const config = getMoMoConfig();

function mask(value) {
  const text = String(value || '');
  if (!text) return '(empty)';
  if (text.length <= 8) return `${text.slice(0, 2)}…(${text.length})`;
  return `${text.slice(0, 4)}…${text.slice(-2)} (len ${text.length})`;
}

function hasWhitespace(value) {
  return /\s/.test(String(value || '').trim());
}

function base64(value) {
  return Buffer.from(value).toString('base64');
}

function interpret(status) {
  if (status === 200) return 'OK';
  if (status === 401) {
    return '401 — MOMO_USER_ID or MOMO_API_KEY is wrong for this environment. The user id must be the X-Reference-Id used when the API user was created.';
  }
  if (status === 403) {
    return '403 — MOMO_SUBSCRIPTION_KEY is wrong. Use the primary key from the "Collections" product, in the same environment as the API user.';
  }
  if (status === 404) {
    return '404 — wrong host or path. Sandbox host is https://sandbox.momodeveloper.mtn.com; the token path is /collection/token.';
  }
  if (status === 400) {
    return '400 — malformed request. Check for quotes, spaces or newlines in the credential values.';
  }
  return `${status} — MTN returned an unexpected status.`;
}

async function call(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body, text };
}

async function main() {
  console.log('Resolved configuration');
  console.log(`  mode:               ${config.mode}`);
  console.log(`  targetEnvironment:  ${config.targetEnvironment}`);
  console.log(`  currency:           ${config.currency}`);
  console.log(`  baseUrl:            ${config.baseUrl}`);
  console.log(`  subscriptionKey:    ${mask(config.subscriptionKey)}`);
  console.log(`  userId:             ${mask(config.userId)}`);
  console.log(`  apiKey:             ${mask(config.apiKey)}`);

  const problems = [];
  if (!config.subscriptionKey) problems.push('MOMO_SUBSCRIPTION_KEY is empty');
  if (!config.userId) problems.push('MOMO_USER_ID is empty');
  if (!config.apiKey) problems.push('MOMO_API_KEY is empty');
  if (hasWhitespace(config.subscriptionKey)) problems.push('MOMO_SUBSCRIPTION_KEY contains whitespace');
  if (hasWhitespace(config.userId)) problems.push('MOMO_USER_ID contains whitespace');
  if (hasWhitespace(config.apiKey)) problems.push('MOMO_API_KEY contains whitespace');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(config.userId)) {
    problems.push('MOMO_USER_ID is not a UUID (it should be the X-Reference-Id used to create the API user)');
  }
  if (config.mode === 'sandbox' && !config.baseUrl.includes('sandbox.momodeveloper.mtn.com')) {
    problems.push('MOMO_ENV=sandbox but MOMO_BASE_URL is not the sandbox host');
  }
  if (config.mode === 'live' && config.baseUrl.includes('sandbox')) {
    problems.push('MOMO_ENV=live but MOMO_BASE_URL is a sandbox host');
  }
  if (config.mode === 'sandbox' && config.targetEnvironment !== 'sandbox') {
    problems.push('MOMO_ENV=sandbox but MOMO_TARGET_ENVIRONMENT is not "sandbox"');
  }
  if (config.mode === 'live' && config.targetEnvironment === 'sandbox') {
    problems.push('MOMO_ENV=live but MOMO_TARGET_ENVIRONMENT is "sandbox"');
  }
  if (config.mode === 'live' && config.currency !== 'GHS') {
    problems.push('MOMO_ENV=live but MOMO_CURRENCY is not "GHS"');
  }

  if (problems.length) {
    console.log('\nConfiguration warnings');
    for (const problem of problems) console.log(`  - ${problem}`);
  }

  if (!config.configured) {
    console.error('\nMissing credentials; skipping the MTN request.');
    process.exitCode = 1;
    return;
  }

  console.log('\n1. Access token');
  const tokenUrl = `${config.baseUrl}/collection/token`;
  let tokenResult;
  try {
    tokenResult = await call(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${base64(`${config.userId}:${config.apiKey}`)}`,
        'Ocp-Apim-Subscription-Key': config.subscriptionKey,
        'X-Target-Environment': config.targetEnvironment,
        Accept: 'application/json',
      },
    });
  } catch (error) {
    console.error(`  Network error calling ${tokenUrl}: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`  POST ${tokenUrl} -> ${tokenResult.status}`);
  if (tokenResult.status !== 200 || !tokenResult.body?.access_token) {
    console.log(`  ${interpret(tokenResult.status)}`);
    console.log(`  MTN response: ${JSON.stringify(tokenResult.body)}`);
    process.exitCode = 1;
    return;
  }
  console.log('  Access token received.');

  const token = tokenResult.body.access_token;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf-8'));
    if (payload.exp) {
      console.log(`  Token expires: ${new Date(payload.exp * 1000).toISOString()}`);
    }
  } catch {
    // Opaque token, nothing to decode.
  }

  const testMsisdn = String(process.env.MOMO_TEST_MSISDN || '').trim();
  if (!testMsisdn) {
    console.log('\nCredentials are valid. Set MOMO_TEST_MSISDN to send a RequestToPay prompt.');
    return;
  }

  const msisdn = toMsisdn(testMsisdn);
  const amount = String(process.env.MOMO_TEST_AMOUNT || '1.00').trim();
  const referenceId = randomUUID();
  const externalId = `diagnose-${Date.now()}`;

  console.log(`\n2. RequestToPay ${amount} ${config.currency} to ${msisdn}`);
  console.log('   A real prompt will be sent if these are live credentials.');
  const payResult = await call(`${config.baseUrl}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Ocp-Apim-Subscription-Key': config.subscriptionKey,
      'X-Target-Environment': config.targetEnvironment,
      'X-Reference-Id': referenceId,
      ...(config.callbackConfigured ? { 'X-Callback-Url': config.callbackUrl } : {}),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      amount,
      currency: config.currency,
      externalId,
      payer: { partyIdType: 'MSISDN', partyId: msisdn },
      payerMessage: 'NKAY credential check',
      payeeNote: 'NKAY credential check',
    }),
  });

  console.log(`  POST /collection/v1_0/requesttopay -> ${payResult.status}`);
  if (!(payResult.status >= 200 && payResult.status < 300)) {
    console.log(`  ${interpret(payResult.status)}`);
    console.log(`  MTN response: ${JSON.stringify(payResult.body)}`);
    process.exitCode = 1;
    return;
  }

  console.log(`  Accepted. referenceId=${referenceId}`);
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const statusResult = await call(
    `${config.baseUrl}/collection/v1_0/requesttopay/${encodeURIComponent(referenceId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Ocp-Apim-Subscription-Key': config.subscriptionKey,
        'X-Target-Environment': config.targetEnvironment,
        Accept: 'application/json',
      },
    }
  );
  console.log(`\n3. Status -> ${statusResult.status}`);
  console.log(`  ${JSON.stringify(statusResult.body)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
