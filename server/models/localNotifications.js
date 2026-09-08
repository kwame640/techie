import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'notifications.json');

function ensureDbExists() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2));
}

export default {
  getAll: () => {
    ensureDbExists();
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8') || '[]');
  },
  setAll: (data) => {
    ensureDbExists();
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  },
};
