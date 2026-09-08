import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as localModel from './registrationModel.js';

const hasFirestoreConfig = Boolean(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
);

function getDatabase() {
  if (!hasFirestoreConfig) return null;

  const app = getApps()[0] || initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });

  return getFirestore(app);
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

export async function getRegistrationStats() {
  const registrations = await getAllRegistrations();
  return {
    total: registrations.length,
    pending: registrations.filter(registration => registration.status === 'Pending').length,
    approved: registrations.filter(registration => registration.status === 'Approved').length,
    rejected: registrations.filter(registration => registration.status === 'Rejected').length,
  };
}
