import { kv } from '@vercel/kv';

const KEY = 'nkay:registrations';

export async function getAllRegistrations() {
  try {
    const data = await kv.get(KEY);
    if (!data) return [];
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('KV read error:', e);
    return [];
  }
}

export async function getRegistrationById(id) {
  const all = await getAllRegistrations();
  return all.find(r => r.id === id) || null;
}

export async function createRegistration(data) {
  const all = await getAllRegistrations();
  const newRegistration = {
    id: 'reg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
    ...data,
    status: 'Pending',
    registrationDate: new Date().toISOString(),
  };
  all.unshift(newRegistration);
  await kv.set(KEY, all);
  return newRegistration;
}

export async function updateRegistrationStatus(id, status) {
  const all = await getAllRegistrations();
  const index = all.findIndex(r => r.id === id);
  if (index === -1) return null;
  all[index].status = status;
  all[index].updatedAt = new Date().toISOString();
  await kv.set(KEY, all);
  return all[index];
}

export async function getRegistrationStats() {
  const all = await getAllRegistrations();
  return {
    total: all.length,
    pending: all.filter(r => r.status === 'Pending').length,
    approved: all.filter(r => r.status === 'Approved').length,
    rejected: all.filter(r => r.status === 'Rejected').length,
  };
}
