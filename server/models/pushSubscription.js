import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'pushSubscriptions.json');

function ensureDbExists() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2));
}

export function getAll() {
  ensureDbExists();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8') || '[]');
}

export function getByEmail(email) {
  ensureDbExists();
  const all = getAll();
  return all.find((s) => s.email === email) || null;
}

export function save(subscription) {
  ensureDbExists();
  const all = getAll();
  const index = all.findIndex((s) => s.email === subscription.email);
  const entry = { ...subscription, updatedAt: new Date().toISOString() };
  if (index >= 0) {
    all[index] = entry;
  } else {
    all.push(entry);
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(all, null, 2));
  return entry;
}

export function removeByEmail(email) {
  ensureDbExists();
  const all = getAll().filter((s) => s.email !== email);
  fs.writeFileSync(DB_PATH, JSON.stringify(all, null, 2));
  return true;
}
