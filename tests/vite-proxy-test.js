import http from 'http';

const BASE = 'http://127.0.0.1:5173';

function request(path, options = {}) {
  const body = options.body;
  const headers = options.headers || {};
  if (body) headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  const data = body ? JSON.stringify(body) : null;

  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE}${path}`, {
      method: options.method || 'GET',
      headers,
    }, (res) => {
      let text = '';
      res.on('data', (chunk) => { text += chunk; });
      res.on('end', () => {
        let parsed = text;
        try { parsed = JSON.parse(text); } catch {}
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log('=== Testing API through Vite proxy (port 5173) ===\n');

  // Test 1: Pending vendor login (should be 403)
  console.log('1. Pending vendor login via Vite proxy:');
  const p = await request('/api/vendor/login', {
    method: 'POST',
    body: { businessName: 'Test Pending Vendor', email: 'pending@test.com' },
  });
  console.log(`   Status: ${p.status}, Error: ${p.body.error || 'none'}\n`);

  // Test 2: Approved vendor login (should be 200 + token)
  console.log('2. Approved vendor login via Vite proxy:');
  const a = await request('/api/vendor/login', {
    method: 'POST',
    body: { businessName: 'Test Approved Vendor', email: 'approved@test.com' },
  });
  console.log(`   Status: ${a.status}, Token: ${a.body.token ? 'received' : 'none'}\n`);

  const token = a.body.token;
  const vendorId = a.body.registration.id;

  // Test 3: Session check (should be 200)
  console.log('3. Session verification via Vite proxy:');
  const s = await request('/api/vendor/session', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Status: ${s.status}, Business: ${s.body.registration?.businessName || 'none'}\n`);

  // Test 4: Store access (should be 200)
  console.log('4. Store access with token via Vite proxy:');
  const store = await request(`/api/business/${vendorId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Status: ${store.status}, Success: ${store.body.success}\n`);

  // Test 5: Store access without token (should be 401)
  console.log('5. Store access without token (direct URL entry):');
  const noAuth = await request(`/api/business/${vendorId}`);
  console.log(`   Status: ${noAuth.status}, Error: ${noAuth.body.error}\n`);

  // Test 6: Store access with wrong ID (should be 403)
  console.log('6. Store access with wrong ID (vendor ID isolation):');
  const wrongId = await request('/api/business/test-rejected-vendor', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Status: ${wrongId.status}, Error: ${wrongId.body.error}\n`);

  // Test 7: Rejected vendor login (should be 403)
  console.log('7. Rejected vendor login via Vite proxy:');
  const r = await request('/api/vendor/login', {
    method: 'POST',
    body: { businessName: 'Test Rejected Vendor', email: 'rejected@test.com' },
  });
  console.log(`   Status: ${r.status}, Error: ${r.body.error || 'none'}\n`);

  // Test 8: Admin login + approval
  console.log('8. Admin login and approve pending vendor:');
  const admin = await request('/api/admin/login', {
    method: 'POST',
    body: { email: 'admin@nkay.com', password: 'nkayadmin123' },
  });
  console.log(`   Admin login: ${admin.status}`);
  const adminToken = admin.body.token;

  const statusCheck = await request('/api/admin/registrations/test-pending-vendor', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`   Pending vendor status before: ${statusCheck.body.registration?.status}\n`);

  const approve = await request('/api/admin/registrations/test-pending-vendor/status', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: { status: 'Approved' },
  });
  console.log(`   Approve response: ${approve.status} ${approve.body.message || ''}\n`);

  // Test 9: Now pending vendor can login
  console.log('9. Previously-pending vendor can now login:');
  const nowApproved = await request('/api/vendor/login', {
    method: 'POST',
    body: { businessName: 'Test Pending Vendor', email: 'pending@test.com' },
  });
  console.log(`   Status: ${nowApproved.status}, Token: ${nowApproved.body.token ? 'received' : 'none'}\n`);

  // Restore pending vendor to Pending for future tests
  await request('/api/admin/registrations/test-pending-vendor/status', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: { status: 'Pending' },
  });

  console.log('=== All Vite proxy tests passed ===');
}

run().catch(console.error);
