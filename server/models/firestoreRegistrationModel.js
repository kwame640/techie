import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as localModel from './registrationModel.js';

function normalizePrivateKey(raw) {
  if (!raw) return '';
  // Support both literal \n sequences in env strings and real newlines.
  let key = String(raw).trim();
  key = key.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
  // Wrap in PEM boundaries if a bare key body was pasted.
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
  // Ensure exactly one newline between header/footer and content
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
      console.warn('Firestore private key did not match expected PEM pattern — falling back to local registration storage.');
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
    console.warn('Firestore init failed (falling back to local storage):', error.message || String(error));
    databaseCache = null;
    return null;
  }
}

const collectionName = 'registrations';

export async function getAllRegistrations() {
  const database = getDatabase();
  if (!database) return localModel.getAllRegistrations();

  const snapshot = await database.collection(collectionName).get();
  const registrations = snapshot.docs
    .map(document => document.data())
    .sort((first, second) => second.registrationDate.localeCompare(first.registrationDate));

  return registrations.length > 0 ? registrations : localModel.getAllRegistrations();
}

export async function getRegistrationById(id) {
  const database = getDatabase();
  if (!database) return localModel.getRegistrationById(id);

  const document = await database.collection(collectionName).doc(id).get();
  return document.exists ? document.data() : null;
}

export async function createRegistration(data) {
  const database = getDatabase();
  if (!database) return localModel.createRegistration(data);

  const registration = {
    id: 'reg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
    ...data,
    status: 'Pending',
    registrationDate: new Date().toISOString(),
  };
  await database.collection(collectionName).doc(registration.id).set(registration);
  return registration;
}

export async function createRegistrationWithId(id, data) {
  const database = getDatabase();
  if (!database) return localModel.createRegistrationWithId(id, data);

  const reference = database.collection(collectionName).doc(id);
  const document = await reference.get();

  if (document.exists) {
    return updateRegistration(id, data);
  }

  const registration = {
    id,
    ...data,
    status: data.status || 'Pending',
    registrationDate: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await reference.set(registration);
  return registration;
}

export async function updateRegistrationStatus(id, status) {
  const database = getDatabase();
  if (!database) return localModel.updateRegistrationStatus(id, status);

  const reference = database.collection(collectionName).doc(id);
  const document = await reference.get();
  if (!document.exists) return null;

  const updated = {
    ...document.data(),
    status,
    updatedAt: new Date().toISOString(),
  };
  await reference.set(updated);
  return updated;
}

export async function updateRegistration(id, updates) {
  const database = getDatabase();
  if (!database) return localModel.updateRegistration(id, updates);

  const reference = database.collection(collectionName).doc(id);
  const document = await reference.get();
  if (!document.exists) return null;

  const updated = {
    ...document.data(),
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await reference.set(updated);
  return updated;
}

export async function getRegistrationStats() {
  const registrations = await getAllRegistrations();
  return {
    total: registrations.length,
    pending: registrations.filter(registration => registration.status === 'Pending').length,
    approved: registrations.filter(registration => registration.status === 'Approved').length,
    rejected: registrations.filter(registration => registration.status === 'Rejected').length,
  };
}
