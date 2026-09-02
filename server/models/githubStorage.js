const REPO = 'kwame640/techie';
const FILE_PATH = 'data/registrations.json';
const API_BASE = 'https://api.github.com';

function getToken() {
  return process.env.GITHUB_TOKEN;
}

function getHeaders() {
  return {
    'Authorization': `token ${getToken()}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'nkay-admin',
  };
}

async function readRegistrationsFile() {
  const res = await fetch(`${API_BASE}/repos/${REPO}/contents/${FILE_PATH}`, {
    headers: getHeaders(),
    cache: 'no-store',
  });
  if (res.status === 404) return { sha: null, content: [] };
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub read failed (${res.status}): ${err}`);
  }
  const data = await res.json();
  const decoded = Buffer.from(data.content, 'base64').toString('utf-8');
  let content = [];
  try {
    content = JSON.parse(decoded);
    if (!Array.isArray(content)) content = [];
  } catch {
    content = [];
  }
  return { sha: data.sha, content };
}

async function writeRegistrationsFile(content, sha) {
  const body = {
    message: `chore: update registrations (${new Date().toISOString()})`,
    content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
  };
  if (sha) body.sha = sha;

  const res = await fetch(`${API_BASE}/repos/${REPO}/contents/${FILE_PATH}`, {
    method: 'PUT',
    headers: {
      ...getHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub write failed (${res.status}): ${err}`);
  }
  return res.json();
}

export async function getAllRegistrations() {
  try {
    const { content } = await readRegistrationsFile();
    return content;
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
  const { sha, content } = await readRegistrationsFile();
  const newRegistration = {
    id: 'reg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
    ...data,
    status: 'Pending',
    registrationDate: new Date().toISOString(),
  };
  content.unshift(newRegistration);
  await writeRegistrationsFile(content, sha);
  return newRegistration;
}

export async function updateRegistrationStatus(id, status) {
  const { sha, content } = await readRegistrationsFile();
  const index = content.findIndex(r => r.id === id);
  if (index === -1) return null;
  content[index].status = status;
  content[index].updatedAt = new Date().toISOString();
  await writeRegistrationsFile(content, sha);
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
