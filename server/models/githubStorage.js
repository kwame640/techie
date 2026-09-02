const GIST_ID = process.env.GIST_ID || '';
const API_BASE = 'https://api.github.com';

function getHeaders() {
  return {
    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'nkay-admin',
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
  const file = data.files && data.files['registrations.json'];
  if (!file) return [];
  try {
    const content = JSON.parse(file.content);
    return Array.isArray(content) ? content : [];
  } catch {
    return [];
  }
}

async function writeGist(content) {
  const res = await fetch(`${API_BASE}/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: {
      ...getHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: {
        'registrations.json': {
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

export async function getAllRegistrations() {
  try {
    return await readGist();
  } catch (e) {
    console.error('getAllRegistrations error:', e.message);
    return [];
  }
}

export async function getRegistrationById(id) {
  const all = await getAllRegistrations();
  return all.find(r => r.id === id) || null;
}

export async function createRegistration(data) {
  const content = await readGist();
  const newRegistration = {
    id: 'reg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
    ...data,
    status: 'Pending',
    registrationDate: new Date().toISOString(),
  };
  content.unshift(newRegistration);
  await writeGist(content);
  return newRegistration;
}

export async function updateRegistrationStatus(id, status) {
  const content = await readGist();
  const index = content.findIndex(r => r.id === id);
  if (index === -1) return null;
  content[index].status = status;
  content[index].updatedAt = new Date().toISOString();
  await writeGist(content);
  return content[index];
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
