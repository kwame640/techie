import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'nkay_data', 'orders.json')
  : path.join(__dirname, 'data', 'orders.json');

function ensureDbExists() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2));
}

function readDb() {
  ensureDbExists();
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDb(orders) {
  ensureDbExists();
  fs.writeFileSync(DB_PATH, JSON.stringify(orders, null, 2));
}

export function newOrderId() {
  return 'ord_' + randomBytes(12).toString('hex');
}

export function generateOrderNumber(existing = readDb()) {
  const date = new Date();
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, '');
  const taken = new Set(existing.map((order) => order.orderNumber));
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    const candidate = `NK-${stamp}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `NK-${stamp}-${Date.now().toString(36).toUpperCase()}`;
}

export function createOrder(order) {
  const orders = readDb();
  const orderNumber = order.orderNumber || generateOrderNumber(orders);
  const record = {
    ...order,
    orderNumber,
    // The order number doubles as Hubtel's client reference. It is unique,
    // stable for the life of the order, and well inside Hubtel's 32 char limit.
    paymentReference: order.paymentReference || orderNumber,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  orders.unshift(record);
  writeDb(orders);
  return record;
}

export function getOrderById(id) {
  return readDb().find((order) => order.id === id) || null;
}

export function getOrderByReference(reference) {
  if (!reference) return null;
  const needle = String(reference).trim();
  if (!needle) return null;
  return (
    readDb().find(
      (order) =>
        order.orderNumber === needle ||
        order.paymentReference === needle ||
        (Array.isArray(order.paymentReferences) && order.paymentReferences.includes(needle))
    ) || null
  );
}

export function findByIdempotencyKey(idempotencyKey) {
  if (!idempotencyKey) return null;
  return readDb().find((order) => order.idempotencyKey === idempotencyKey) || null;
}

/**
 * Returns orders in any of the supplied payment states, newest first.
 * `updatedSinceMs` limits the scan to orders touched recently — the
 * reconciler only needs to watch live payments, not years of history.
 */
export function listOrdersByPaymentStatus(statuses, { updatedSinceMs, limit = 50 } = {}) {
  const wanted = new Set(Array.isArray(statuses) ? statuses : [statuses]);
  const max = Math.max(1, Math.min(200, Number(limit) || 50));
  return readDb()
    .filter((order) => wanted.has(order.paymentStatus))
    .filter((order) => {
      if (!updatedSinceMs) return true;
      const touched = Date.parse(order.updatedAt || order.createdAt || '');
      return Number.isFinite(touched) && touched >= updatedSinceMs;
    })
    .slice(0, max);
}

export function updateOrder(id, updates) {
  const orders = readDb();
  const index = orders.findIndex((order) => order.id === id);
  if (index === -1) return null;
  orders[index] = {
    ...orders[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeDb(orders);
  return orders[index];
}

export function listOrders(limit = 200) {
  return readDb().slice(0, Math.max(1, Math.min(500, Number(limit) || 200)));
}
