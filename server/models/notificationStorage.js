const GIST_ID = process.env.GIST_ID || '';
const API_BASE = 'https://api.github.com';
const NOTIF_FILE = 'notifications.json';

function getHeaders() {
  return {
    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'nkay-notifications',
  };
}

async function readGist() {
  if (!GIST_ID) return [];
  const res = await fetch(`${API_BASE}/gists/${GIST_ID}`, {
    headers: getHeaders(),
    cache: 'no-store',
  });
  if (res.status === 404) return [];
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gist read failed (${res.status}): ${err}`);
  }
  const data = await res.json();
  const file = data.files && data.files[NOTIF_FILE];
  if (!file) return [];
  try {
    const content = JSON.parse(file.content);
    return Array.isArray(content) ? content : [];
  } catch {
    return [];
  }
}

async function writeGist(content) {
  if (!GIST_ID) {
    const { default: local } = await import('./localNotifications.js');
    await local.setAll(content);
    return;
  }
  const res = await fetch(`${API_BASE}/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: {
      ...getHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: {
        [NOTIF_FILE]: {
          content: JSON.stringify(content, null, 2),
        },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gist write failed (${res.status}): ${err}`);
  }
  return res.json();
}

export async function getAllNotifications() {
  try {
    const all = await readGist();
    return all;
  } catch (e) {
    console.error('getAllNotifications error:', e.message);
    return [];
  }
}

export async function getUnreadCount() {
  const all = await getAllNotifications();
  return all.filter(n => !n.read).length;
}

export async function getNotificationById(id) {
  const all = await getAllNotifications();
  return all.find(n => n.id === id) || null;
}

export async function createNotification(data) {
  const all = await readGist();
  const newNotification = {
    id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
    title: data.title,
    message: data.message,
    type: data.type || 'info',
    read: false,
    createdAt: new Date().toISOString(),
    ...data,
  };
  all.unshift(newNotification);
  const limited = all.slice(0, 100);
  await writeGist(limited);
  return newNotification;
}

export async function markAsRead(id) {
  const all = await readGist();
  const index = all.findIndex(n => n.id === id);
  if (index === -1) return null;
  all[index].read = true;
  all[index].readAt = new Date().toISOString();
  await writeGist(all);
  return all[index];
}

export async function markAllAsRead() {
  const all = await readGist();
  const updated = all.map(n => ({ ...n, read: true, readAt: new Date().toISOString() }));
  await writeGist(updated);
  return updated;
}

export async function deleteNotification(id) {
  const all = await readGist();
  const filtered = all.filter(n => n.id !== id);
  await writeGist(filtered);
  return true;
}

export async function getNotificationsByType(type) {
  const all = await getAllNotifications();
  return all.filter(n => n.type === type);
}
