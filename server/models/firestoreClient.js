import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Shared Firestore client for the models that need durable storage on
 * serverless hosts. `firebase-admin` is already used for OTPs and business
 * registrations, so orders reuse the same service account.
 *
 * Environment is read lazily (not at import time) so values loaded from .env
 * by the server entry point are still picked up.
 */

export function normalizePrivateKey(raw) {
  if (!raw) return '';
  // Support both literal \n sequences in env strings and real newlines.
  let key = String(raw).trim();
  key = key.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
  const header = '-----BEGIN PRIVATE KEY-----';
  const footer = '-----END PRIVATE KEY-----';
  if (!key.startsWith('-----BEGIN')) {
    const body = key
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n');
    key = `${header}\n${body}\n${footer}`;
  }
  return key
    .replace(/\r\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(new RegExp(`${header}\\s*`), `${header}\n`)
    .replace(new RegExp(`\\s*${footer}`), `\n${footer}`)
    .trim();
}

export function isFirestoreConfigured() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}

let databaseCache = null;
let databaseInitTried = false;
let lastInitError = null;

/**
 * Returns a Firestore handle, or null when the service account is not
 * configured (local development) or initialization failed.
 */
export function getFirestoreDb() {
  if (!isFirestoreConfigured()) return null;
  if (databaseInitTried) return databaseCache;
  databaseInitTried = true;

  try {
    const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
      lastInitError = 'FIREBASE_PRIVATE_KEY did not look like a PEM private key';
      console.warn('Firestore disabled:', lastInitError);
      return null;
    }

    const app =
      getApps()[0] ||
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });

    databaseCache = getFirestore(app);
    return databaseCache;
  } catch (error) {
    lastInitError = error.message || String(error);
    console.warn('Firestore init failed:', lastInitError);
    databaseCache = null;
    return null;
  }
}

export function firestoreStatus() {
  return {
    configured: isFirestoreConfigured(),
    ready: Boolean(getFirestoreDb()),
    error: lastInitError,
  };
}
