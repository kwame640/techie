import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { build } from 'esbuild';

// Generates server/data/catalogue.json from the frontend catalogue.
// Run with: npm run sync:catalogue
// The backend treats this file as the authoritative source of product prices
// and stock, so client-submitted prices are never trusted.

const root = process.cwd();
const tmpDir = path.join(root, '.tmp-catalogue');

async function bundle(entry) {
  const outfile = path.join(tmpDir, path.basename(entry).replace(/\.ts$/, '.mjs'));
  await build({
    entryPoints: [path.join(root, entry)],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    logLevel: 'silent',
  });
  return import(pathToFileURL(outfile).href + `?t=${Date.now()}`);
}

fs.mkdirSync(tmpDir, { recursive: true });

const { sampleProducts, sampleBusinesses } = await bundle('src/data/marketplaceData.ts');
const { products: legacyProducts } = await bundle('src/data/products.ts');

const money = (value) => Math.max(0, Math.round(Number(value || 0) * 100));

const businesses = {};
for (const business of sampleBusinesses) {
  businesses[business.id] = {
    id: business.id,
    name: business.name,
    phone: business.phone || '',
    email: business.email || '',
    city: business.city || '',
    region: business.region || '',
    pickupLocation: business.pickupLocation || '',
  };
}
businesses['nkay-shop'] = {
  id: 'nkay-shop',
  name: 'NKAY Shop',
  phone: '0552951226',
  email: 'support@nkay.com',
  city: 'Accra',
  region: 'Greater Accra',
  pickupLocation: 'Accra, Ghana',
};

function toCatalogProduct(product, businessId, stock) {
  const basePrice = Number(product.price) || 0;
  const discount = Number(product.discountPrice) || 0;
  const hasDiscount = discount > 0 && discount < basePrice;
  const selling = hasDiscount ? discount : basePrice;
  const images = Array.isArray(product.images) && product.images.length
    ? product.images
    : [product.image || ''];

  return {
    id: product.id,
    businessId,
    businessName: businesses[businessId]?.name || 'NKAY Shop',
    name: product.name,
    description: product.description || '',
    category: product.category || '',
    image: images[0] || '',
    images: images.filter(Boolean),
    sku: product.sku || '',
    pricePesewas: money(selling),
    originalPricePesewas: hasDiscount ? money(basePrice) : null,
    stock: Math.max(0, Math.floor(Number(stock) || 0)),
    status: product.status || 'active',
  };
}

const catalogProducts = [];
for (const product of sampleProducts) {
  catalogProducts.push(
    toCatalogProduct(product, product.businessId, product.stock)
  );
}
for (const product of legacyProducts) {
  catalogProducts.push(
    toCatalogProduct(product, 'nkay-shop', product.inStock ? 50 : 0)
  );
}

const catalogue = {
  generatedAt: new Date().toISOString(),
  currency: 'GHS',
  delivery: { homePesewas: 3000, pickupPesewas: 0 },
  businesses,
  products: catalogProducts,
};

const outPath = path.join(root, 'server/data/catalogue.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(catalogue, null, 2) + '\n');
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(`Wrote ${catalogProducts.length} products to ${path.relative(root, outPath)}`);
