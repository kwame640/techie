import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATALOGUE_PATH = path.join(__dirname, '../data/catalogue.json');
const STOCK_PATH = process.env.VERCEL
  ? path.join('/tmp', 'nkay_data', 'stock.json')
  : path.join(__dirname, 'data', 'stock.json');

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

export function getProduct(productId) {
  const product = loadCatalogue().productsById.get(String(productId));
  if (!product) return null;
  return { ...product, stock: getEffectiveStock(product.id) };
}

export function getBusiness(businessId) {
  return loadCatalogue().businesses[String(businessId)] || null;
}

export function getEffectiveStock(productId) {
  const product = loadCatalogue().productsById.get(String(productId));
  if (!product) return 0;
  const overrides = readStockOverrides();
  const override = overrides[product.id];
  return Number.isInteger(override) ? override : product.stock;
}

export function getDeliveryFeePesewas(method) {
  const delivery = loadCatalogue().delivery || {};
  if (method === 'pickup') return Number(delivery.pickupPesewas) || 0;
  return Number(delivery.homePesewas) || 0;
}

/**
 * Decrements stock for the supplied items. The check and write happen
 * synchronously in the same tick, so two concurrent requests cannot both
 * pass the availability check in this process.
 */
export function reserveStock(items) {
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
