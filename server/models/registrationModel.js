import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'nkay_data', 'registrations.json')
  : path.join(__dirname, 'data', 'registrations.json');

function ensureDbExists() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2));
  }
}

function readDb() {
  ensureDbExists();
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function writeDb(data) {
  ensureDbExists();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export function getAllRegistrations() {
  return readDb();
}

export function getRegistrationById(id) {
  const registrations = readDb();
  return registrations.find(r => r.id === id) || null;
}

export function createRegistration(data) {
  const registrations = readDb();
  const newRegistration = {
    id: 'reg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
    ...data,
    status: 'Pending',
    registrationDate: new Date().toISOString(),
  };
  registrations.unshift(newRegistration);
  writeDb(registrations);
  return newRegistration;
}

export function updateRegistrationStatus(id, status) {
  const registrations = readDb();
  const index = registrations.findIndex(r => r.id === id);
  if (index === -1) {
    return null;
  }
  registrations[index].status = status;
  registrations[index].updatedAt = new Date().toISOString();
  writeDb(registrations);
  return registrations[index];
}

export function getRegistrationStats() {
  const registrations = readDb();
  return {
    total: registrations.length,
    pending: registrations.filter(r => r.status === 'Pending').length,
    approved: registrations.filter(r => r.status === 'Approved').length,
    rejected: registrations.filter(r => r.status === 'Rejected').length,
  };
}
