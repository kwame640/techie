import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getFirestoreDb, isFirestoreConfigured } from './firestoreClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATALOGUE_PATH = path.join(__dirname, '../data/catalogue.json');
const STOCK_COLLECTION = 'stock';
const STOCK_PATH = process.env.VERCEL
  ? path.join('/tmp', 'nkay_data', 'stock.json')
  : path.join(__dirname, 'data', 'stock.json');

const STOCK_CACHE_TTL_MS = 5000;
const stockCache = new Map();
let stockHydratedAt = 0;

let catalogueCache = null;

function loadCatalogue() {
  if (catalogueCache) return catalogueCache;
  const raw = fs.readFileSync(CATALOGUE_PATH, 'utf-8');
  const parsed = JSON.parse(raw);
  catalogueCache = {
    ...parsed,
    productsById: new Map(parsed.products.map((product) => [product.id, product])),
  };
  return catalogueCache;
}

function ensureStockFile() {
  const dir = path.dirname(STOCK_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(STOCK_PATH)) fs.writeFileSync(STOCK_PATH, JSON.stringify({}, null, 2));
}

function readStockOverrides() {
  ensureStockFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(STOCK_PATH, 'utf-8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeStockOverrides(overrides) {
  ensureStockFile();
  fs.writeFileSync(STOCK_PATH, JSON.stringify(overrides, null, 2));
}

export function getCatalogueMeta() {
  const catalogue = loadCatalogue();
  return {
    currency: catalogue.currency,
    delivery: catalogue.delivery,
    generatedAt: catalogue.generatedAt,
  };
}

/** Stock straight from the generated catalogue, ignoring sold units. */
export function getCatalogueStock(productId) {
  const product = loadCatalogue().productsById.get(String(productId));
  return product ? Number(product.stock) || 0 : 0;
}

/**
 * Loads the current stock overrides into the in-process cache.
 *
 * Only needed when Firestore is configured: the local JSON mode reads its file
 * synchronously and is always up to date. Called at the start of quote/order
 * requests so a cold serverless instance does not serve catalogue defaults for
 * products that have already sold out.
 */
export async function hydrateStock() {
  const database = getFirestoreDb();
  if (!database) return;

  const now = Date.now();
  if (now - stockHydratedAt < STOCK_CACHE_TTL_MS) return;

  const snapshot = await database.collection(STOCK_COLLECTION).get();
  const next = new Map();
  for (const document of snapshot.docs) {
    const value = document.get('value');
    if (Number.isInteger(value)) next.set(document.id, value);
  }

  stockCache.clear();
  for (const [productId, value] of next.entries()) stockCache.set(productId, value);
  stockHydratedAt = Date.now();
}

/** Records stock values written by a transaction so later reads in this process agree. */
export function rememberStock(entries) {
  if (!isFirestoreConfigured()) return;
  for (const [productId, value] of entries.entries()) {
    if (Number.isInteger(value)) stockCache.set(String(productId), value);
  }
}

export function getProduct(productId) {
  const product = loadCatalogue().productsById.get(String(productId));
  if (!product) return null;
  return { ...product, stock: getEffectiveStock(product.id) };
}

export function getBusiness(businessId) {
  return loadCatalogue().businesses[String(businessId)] || null;
}

export function getEffectiveStock(productId) {
  const id = String(productId);
  if (isFirestoreConfigured()) {
    const cached = stockCache.get(id);
    return Number.isInteger(cached) ? cached : getCatalogueStock(id);
  }

  const override = readStockOverrides()[id];
  return Number.isInteger(override) ? override : getCatalogueStock(id);
}

export function getDeliveryFeePesewas(method) {
  const delivery = loadCatalogue().delivery || {};
  if (method === 'pickup') return Number(delivery.pickupPesewas) || 0;
  return Number(delivery.homePesewas) || 0;
}

/**
 * Decrements stock against the local JSON file. The check and write happen
 * synchronously in the same tick, so two concurrent requests cannot both pass
 * the availability check in this process.
 *
 * Firestore deployments use the transactional path in orderModel.js instead.
 */
export function reserveStockLocal(items) {
  const overrides = readStockOverrides();
  const available = new Map();
  const failures = [];

  for (const item of items) {
    const product = loadCatalogue().productsById.get(String(item.productId));
    const current = product
      ? (Number.isInteger(overrides[product.id]) ? overrides[product.id] : product.stock)
      : 0;
    if (!product) {
      failures.push({ productId: item.productId, reason: 'Product not found' });
      continue;
    }
    if (current < item.quantity) {
      failures.push({
        productId: item.productId,
        productName: product.name,
        reason: `Only ${current} left in stock`,
        available: current,
      });
      continue;
    }
    available.set(product.id, current);
  }

  if (failures.length) return { ok: false, failures };

  for (const item of items) {
    const next = available.get(String(item.productId)) - item.quantity;
    overrides[item.productId] = next;
  }
  writeStockOverrides(overrides);
  return { ok: true };
}
