import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'nkay_data', 'business_images.json')
  : path.join(__dirname, 'data', 'business_images.json');

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

export function createBusinessImage(data) {
  const images = readDb();
  const newImage = {
    id: 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
    businessRegistrationId: data.businessRegistrationId,
    imageUrl: data.imageUrl,
    imageKey: data.imageKey,
    originalName: data.originalName || '',
    createdAt: new Date().toISOString(),
  };
  images.push(newImage);
  writeDb(images);
  return newImage;
}

export function getImagesByRegistrationId(registrationId) {
  const images = readDb();
  return images.filter(img => img.businessRegistrationId === registrationId);
}

export function getImageById(id) {
  const images = readDb();
  return images.find(img => img.id === id) || null;
}

export function deleteImage(id) {
  const images = readDb();
  const index = images.findIndex(img => img.id === id);
  if (index === -1) {
    return null;
  }
  const deleted = images.splice(index, 1)[0];
  writeDb(images);
  return deleted;
}

export function deleteImagesByRegistrationId(registrationId) {
  const images = readDb();
  const filtered = images.filter(img => img.businessRegistrationId !== registrationId);
  writeDb(filtered);
  return images.length - filtered.length;
}
