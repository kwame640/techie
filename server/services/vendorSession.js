import crypto from 'crypto';

const SESSION_SECRET =
  process.env.VENDOR_SESSION_SECRET ||
  process.env.ADMIN_PASSWORD ||
  'nkay-vendor-secret-change-me';

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function base64urlEncode(input) {
  return Buffer.from(input, 'utf-8').toString('base64url');
}

function base64urlDecode(input) {
  return Buffer.from(input, 'base64url').toString('utf-8');
}

export function createVendorToken(registrationId, email) {
  const payload = JSON.stringify({
    id: registrationId,
    email: email || '',
    exp: Date.now() + TOKEN_EXPIRY_MS,
  });
  const payloadB64 = base64urlEncode(payload);
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${signature}`;
}

export function verifyVendorToken(token) {
  if (!token || typeof token !== 'string') return null;

  const dotIndex = token.lastIndexOf('.');
  if (dotIndex === -1) return null;

  const payloadB64 = token.substring(0, dotIndex);
  const signature = token.substring(dotIndex + 1);

  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');

  const sigBuf = Buffer.from(signature, 'base64url');
  const expectedBuf = Buffer.from(expectedSignature, 'base64url');

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64urlDecode(payloadB64));
    if (!payload.id || !payload.exp || Date.now() > payload.exp) return null;
    return { id: payload.id, email: payload.email, exp: payload.exp };
  } catch {
    return null;
  }
}
