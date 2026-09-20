import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function normalizePrivateKey(raw) {
  if (!raw) return '';
  let key = String(raw).trim();
  key = key.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
  const header = '-----BEGIN PRIVATE KEY-----';
  const footer = '-----END PRIVATE KEY-----';
  if (!key.startsWith('-----BEGIN')) {
    const body = key
      .split('\n')
      .map((l) => l.trim())
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

const hasFirestoreConfig = Boolean(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
);

let databaseCache = null;
let databaseInitTried = false;

function getDatabase() {
  if (!hasFirestoreConfig) return null;
  if (databaseInitTried) return databaseCache;
  databaseInitTried = true;

  try {
    const normalizedPrivateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
    if (!normalizedPrivateKey.includes('-----BEGIN PRIVATE KEY-----') || !normalizedPrivateKey.includes('-----END PRIVATE KEY-----')) {
      console.warn('Firestore private key did not match expected PEM pattern — falling back to local OTP storage.');
      return null;
    }
    const app = getApps()[0] || initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: normalizedPrivateKey,
      }),
    });
    databaseCache = getFirestore(app);
    return databaseCache;
  } catch (error) {
    console.warn('Firestore init failed (falling back to local OTP storage):', error.message || String(error));
    databaseCache = null;
    return null;
  }
}

const collectionName = 'otps';

// OTPs are short-lived; on Vercel without Firestore the local file lives in /tmp.
const DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'nkay_data', 'otps.json')
  : path.join(__dirname, 'data', 'otps.json');

function ensureDbExists() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
}

function readLocal() {
  ensureDbExists();
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) || {};
  } catch (error) {
    return {};
  }
}

function writeLocal(data) {
  ensureDbExists();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Each entry: { email, code, attempts, expiresAt (ISO), lastSentAt (ISO), createdAt (ISO) }
export async function getOtp(email) {
  const key = String(email || '').trim().toLowerCase();
  if (!key) return null;

  const database = getDatabase();
  if (!database) return readLocal()[key] || null;

  const document = await database.collection(collectionName).doc(key).get();
  return document.exists ? document.data() : null;
}

export async function saveOtp(email, entry) {
  const key = String(email || '').trim().toLowerCase();
  if (!key) return null;

  const database = getDatabase();
  if (!database) {
    const data = readLocal();
    data[key] = { ...entry, email: key };
    writeLocal(data);
    return data[key];
  }

  await database.collection(collectionName).doc(key).set({ ...entry, email: key });
  return { ...entry, email: key };
}

export async function updateOtp(email, patch) {
  const key = String(email || '').trim().toLowerCase();
  if (!key) return null;

  const database = getDatabase();
  if (!database) {
    const data = readLocal();
    if (data[key]) {
      data[key] = { ...data[key], ...patch };
      writeLocal(data);
      return data[key];
    }
    return null;
  }

  const reference = database.collection(collectionName).doc(key);
  const document = await reference.get();
  if (!document.exists) return null;

  const updated = { ...document.data(), ...patch };
  await reference.set(updated);
  return updated;
}

export async function deleteOtp(email) {
  const key = String(email || '').trim().toLowerCase();
  if (!key) return;

  const database = getDatabase();
  if (!database) {
    const data = readLocal();
    delete data[key];
    writeLocal(data);
    return;
  }

  await database.collection(collectionName).doc(key).delete();
}