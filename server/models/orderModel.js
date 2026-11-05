import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';
import { getFirestoreDb, isFirestoreConfigured } from './firestoreClient.js';
import { getCatalogueStock, rememberStock, reserveStockLocal } from './productCatalogModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ORDERS_COLLECTION = 'orders';
const STOCK_COLLECTION = 'stock';

const DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'nkay_data', 'orders.json')
  : path.join(__dirname, 'data', 'orders.json');

// ---------------------------------------------------------------------------
// Local JSON fallback (development / no service account)
// ---------------------------------------------------------------------------

function ensureDbExists() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2));
}

function readLocalDb() {
  ensureDbExists();
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalDb(orders) {
  ensureDbExists();
  fs.writeFileSync(DB_PATH, JSON.stringify(orders, null, 2));
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, stripUndefined(entry)])
    );
  }
  return value;
}

function isPaid(order) {
  return Boolean(order) && order.paymentStatus === 'paid';
}

function stockFailureReason(items, failures) {
  const names = failures
    .map((failure) => {
      const item = items.find((candidate) => String(candidate.productId) === String(failure.productId));
      return item?.productName || failure.productId;
    })
    .join(', ');
  return `Payment was received, but stock ran out for: ${names}. NKAY support will contact you about a refund — do not pay again.`;
}

/**
 * Reports where orders are being stored. `durable` is false for the local JSON
 * file, which is ephemeral on serverless hosts.
 */
export function orderStoreInfo() {
  return {
    mode: isFirestoreConfigured() ? 'firestore' : 'local-json',
    durable: isFirestoreConfigured(),
  };
}

export function newOrderId() {
  return 'ord_' + randomBytes(12).toString('hex');
}

// ---------------------------------------------------------------------------
// Order numbers
// ---------------------------------------------------------------------------

function orderNumberCandidate() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `NK-${stamp}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

async function generateOrderNumber() {
  const database = getFirestoreDb();

  if (!database) {
    const taken = new Set(readLocalDb().map((order) => order.orderNumber));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = orderNumberCandidate();
      if (!taken.has(candidate)) return candidate;
    }
  } else {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = orderNumberCandidate();
      const existing = await database
        .collection(ORDERS_COLLECTION)
        .where('orderNumber', '==', candidate)
        .limit(1)
        .get();
      if (existing.empty) return candidate;
    }
  }

  return `NK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString(36).toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createOrder(order) {
  const database = getFirestoreDb();
  const now = new Date().toISOString();
  const record = stripUndefined({
    ...order,
    orderNumber: order.orderNumber || (await generateOrderNumber()),
    // The order number is the initial payment reference. MTN gets a unique
    // reference per RequestToPay attempt, which is stored when payment starts.
    paymentReference: order.paymentReference || order.orderNumber || undefined,
    createdAt: now,
    updatedAt: now,
  });
  record.paymentReference = record.paymentReference || record.orderNumber;

  if (!database) {
    const orders = readLocalDb();
    orders.unshift(record);
    writeLocalDb(orders);
    return record;
  }

  // The order id is the document id, so a retry can never create a duplicate.
  await database.collection(ORDERS_COLLECTION).doc(record.id).create(record);
  return record;
}

export async function getOrderById(id) {
  const orderId = String(id || '').trim();
  if (!orderId) return null;
  const database = getFirestoreDb();
  if (!database) return readLocalDb().find((order) => order.id === orderId) || null;

  const document = await database.collection(ORDERS_COLLECTION).doc(orderId).get();
  return document.exists ? document.data() : null;
}

export async function getOrderByReference(reference) {
  const needle = String(reference || '').trim();
  if (!needle) return null;
  const database = getFirestoreDb();

  if (!database) {
    return (
      readLocalDb().find(
        (order) =>
          order.orderNumber === needle ||
          order.paymentReference === needle ||
          (Array.isArray(order.paymentReferences) && order.paymentReferences.includes(needle))
      ) || null
    );
  }

  const collection = database.collection(ORDERS_COLLECTION);
  const matches = await Promise.all([
    collection.where('orderNumber', '==', needle).limit(1).get(),
    collection.where('paymentReference', '==', needle).limit(1).get(),
    collection.where('paymentReferences', 'array-contains', needle).limit(1).get(),
  ]);
  const found = matches.find((snapshot) => !snapshot.empty);
  return found ? found.docs[0].data() : null;
}

export async function getOrderByPaymentToken(token) {
  const needle = String(token || '').trim();
  if (!needle) return null;
  const database = getFirestoreDb();

  if (!database) {
    return (
      readLocalDb().find(
        (order) =>
          order.paymentToken === needle ||
          (Array.isArray(order.paymentTokens) && order.paymentTokens.includes(needle))
      ) || null
    );
  }

  const collection = database.collection(ORDERS_COLLECTION);
  const matches = await Promise.all([
    collection.where('paymentToken', '==', needle).limit(1).get(),
    collection.where('paymentTokens', 'array-contains', needle).limit(1).get(),
  ]);
  const found = matches.find((snapshot) => !snapshot.empty);
  return found ? found.docs[0].data() : null;
}

export async function findByIdempotencyKey(idempotencyKey) {
  const key = String(idempotencyKey || '').trim();
  if (!key) return null;
  const database = getFirestoreDb();

  if (!database) {
    return readLocalDb().find((order) => order.idempotencyKey === key) || null;
  }

  const snapshot = await database
    .collection(ORDERS_COLLECTION)
    .where('idempotencyKey', '==', key)
    .limit(1)
    .get();
  return snapshot.empty ? null : snapshot.docs[0].data();
}

/**
 * Returns orders in any of the supplied payment states, newest first.
 * `updatedSinceMs` limits the scan to orders touched recently — the
 * reconciler only needs to watch live payments, not years of history.
 */
export async function listOrdersByPaymentStatus(statuses, { updatedSinceMs, limit = 50 } = {}) {
  const wanted = new Set(Array.isArray(statuses) ? statuses : [statuses]);
  const max = Math.max(1, Math.min(200, Number(limit) || 50));
  const database = getFirestoreDb();

  const filtered = (orders) =>
    orders
      .filter((order) => wanted.has(order.paymentStatus))
      .filter((order) => {
        if (!updatedSinceMs) return true;
        const touched = Date.parse(order.updatedAt || order.createdAt || '');
        return Number.isFinite(touched) && touched >= updatedSinceMs;
      })
      .slice(0, max);

  if (!database) {
    return filtered(readLocalDb());
  }

  // Single-field range + orderBy, so no composite index is required. Extra
  // rows are filtered in memory because `in` queries cap at 30 values.
  let query = database.collection(ORDERS_COLLECTION);
  if (updatedSinceMs) {
    query = query.where('updatedAt', '>=', new Date(updatedSinceMs).toISOString());
  }
  const snapshot = await query.orderBy('updatedAt', 'desc').limit(200).get();
  return filtered(snapshot.docs.map((document) => document.data()));
}

export async function updateOrder(id, updates) {
  const orderId = String(id || '').trim();
  if (!orderId) return null;
  const database = getFirestoreDb();
  const now = new Date().toISOString();

  if (!database) {
    const orders = readLocalDb();
    const index = orders.findIndex((order) => order.id === orderId);
    if (index === -1) return null;
    orders[index] = stripUndefined({ ...orders[index], ...updates, updatedAt: now });
    writeLocalDb(orders);
    return orders[index];
  }

  const reference = database.collection(ORDERS_COLLECTION).doc(orderId);
  const document = await reference.get();
  if (!document.exists) return null;

  const updated = stripUndefined({ ...document.data(), ...updates, updatedAt: now });
  await reference.set(updated);
  return updated;
}

export async function listOrders(limit = 200) {
  const max = Math.max(1, Math.min(500, Number(limit) || 200));
  const database = getFirestoreDb();
  if (!database) return readLocalDb().slice(0, max);

  const snapshot = await database
    .collection(ORDERS_COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(max)
    .get();
  return snapshot.docs.map((document) => document.data());
}

// ---------------------------------------------------------------------------
// Paid-payment finalisation
// ---------------------------------------------------------------------------

/**
 * Marks a verified payment as paid and decrements stock exactly once.
 *
 * With Firestore this runs in a single transaction over the order document and
 * every affected stock document. Two callbacks arriving at the same moment on
 * different serverless instances therefore serialise: one commits, the other
 * sees `paymentStatus: 'paid'` and leaves inventory untouched.
 *
 * Returns { state, order, failures? } where state is one of:
 * 'paid' | 'attention' | 'already_paid' | 'missing'.
 */
export async function finalizePaidOrder(orderId, paymentDetails, items) {
  const database = getFirestoreDb();

  if (!database) {
    return finalizePaidOrderLocal(orderId, paymentDetails, items);
  }

  const orderReference = database.collection(ORDERS_COLLECTION).doc(orderId);
  const productIds = [...new Set((items || []).map((item) => String(item.productId)))];
  const stockReferences = productIds.map((productId) =>
    database.collection(STOCK_COLLECTION).doc(productId)
  );

  let committedStock = null;
  const result = await database.runTransaction(async (transaction) => {
    // All reads must happen before any writes inside a Firestore transaction.
    const orderSnapshot = await transaction.get(orderReference);
    if (!orderSnapshot.exists) {
      return { state: 'missing', order: null };
    }
    const current = orderSnapshot.data();
    if (isPaid(current)) {
      return { state: 'already_paid', order: current };
    }

    const stockSnapshots = await Promise.all(
      stockReferences.map((reference) => transaction.get(reference))
    );

    const available = new Map();
    stockSnapshots.forEach((snapshot, index) => {
      const productId = productIds[index];
      const value = snapshot.exists ? snapshot.get('value') : undefined;
      available.set(
        productId,
        Number.isInteger(value) ? value : getCatalogueStock(productId)
      );
    });

    const failures = [];
    const nextStock = new Map();
    for (const item of items || []) {
      const productId = String(item.productId);
      const currentStock = available.get(productId) ?? 0;
      if (currentStock < item.quantity) {
        failures.push({ productId, available: currentStock });
      } else {
        nextStock.set(productId, currentStock - item.quantity);
      }
    }

    const now = new Date().toISOString();

    if (failures.length) {
      const reason = stockFailureReason(items, failures);
      const updated = stripUndefined({
        ...current,
        ...paymentDetails,
        paymentStatus: 'attention',
        orderStatus: 'new',
        paidAt: now,
        stockReservedAt: null,
        failureReason: reason,
        updatedAt: now,
      });
      transaction.set(orderReference, updated);
      return { state: 'attention', order: updated, failures, reason };
    }

    for (const [productId, value] of nextStock.entries()) {
      transaction.set(
        database.collection(STOCK_COLLECTION).doc(productId),
        { value, updatedAt: now },
        { merge: true }
      );
    }

    const updated = stripUndefined({
      ...current,
      ...paymentDetails,
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
      paidAt: now,
      stockReservedAt: now,
      failureReason: null,
      updatedAt: now,
    });
    transaction.set(orderReference, updated);

    committedStock = nextStock;

    return { state: 'paid', order: updated };
  });

  if (result.state === 'paid' && committedStock) {
    rememberStock(committedStock);
  }
  return result;
}

function finalizePaidOrderLocal(orderId, paymentDetails, items) {
  const orders = readLocalDb();
  const index = orders.findIndex((order) => order.id === orderId);
  if (index === -1) return { state: 'missing', order: null };

  const current = orders[index];
  if (isPaid(current)) return { state: 'already_paid', order: current };

  const reservation = reserveStockLocal(items);
  const now = new Date().toISOString();

  if (!reservation.ok) {
    const reason = stockFailureReason(items, reservation.failures);
    orders[index] = stripUndefined({
      ...current,
      ...paymentDetails,
      paymentStatus: 'attention',
      orderStatus: 'new',
      paidAt: now,
      stockReservedAt: null,
      failureReason: reason,
      updatedAt: now,
    });
    writeLocalDb(orders);
    return {
      state: 'attention',
      order: orders[index],
      failures: reservation.failures,
      reason,
    };
  }

  orders[index] = stripUndefined({
    ...current,
    ...paymentDetails,
    paymentStatus: 'paid',
    orderStatus: 'confirmed',
    paidAt: now,
    stockReservedAt: now,
    failureReason: null,
    updatedAt: now,
  });
  writeLocalDb(orders);
  return { state: 'paid', order: orders[index] };
}
