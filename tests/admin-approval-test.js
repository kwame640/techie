import http from 'http';

const BASE = 'http://127.0.0.1:3001';

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
  // Step 1: Admin login
  console.log('=== Step 1: Admin login ===');
  const adminLogin = await request('/api/admin/login', {
    method: 'POST',
    body: { email: 'admin@nkay.com', password: 'nkayadmin123' },
  });
  console.log(`Status: ${adminLogin.status}`);
  const adminToken = adminLogin.body.token;

  if (!adminToken) {
    console.log('Admin login failed!');
    return;
  }

  // Step 2: Verify pending vendor cannot login yet
  console.log('\n=== Step 2: Pending vendor tries to login (should be denied) ===');
  const pendingLogin = await request('/api/vendor/login', {
    method: 'POST',
    body: { businessName: 'Test Pending Vendor', email: 'pending@test.com' },
  });
  console.log(`Status: ${pendingLogin.status}`);
  console.log('Body:', JSON.stringify(pendingLogin.body));

  // Step 3: Admin approves the pending vendor
  console.log('\n=== Step 3: Admin approves pending vendor ===');
  const approve = await request('/api/admin/registrations/test-pending-vendor/status', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: { status: 'Approved' },
  });
  console.log(`Status: ${approve.status}`);
  console.log('Body:', JSON.stringify(approve.body));

  // Step 4: Pending vendor can now login (status changed to Approved)
  console.log('\n=== Step 4: Approved vendor (was pending) can now login ===');
  const newlyApprovedLogin = await request('/api/vendor/login', {
    method: 'POST',
    body: { businessName: 'Test Pending Vendor', email: 'pending@test.com' },
  });
  console.log(`Status: ${newlyApprovedLogin.status}`);
  console.log('Body:', JSON.stringify(newlyApprovedLogin.body).substring(0, 200));

  const vendorToken = newlyApprovedLogin.body?.token;
  const vendorId = newlyApprovedLogin.body?.registration?.id;

  // Step 5: Newly approved vendor can access their store
  console.log('\n=== Step 5: Approved vendor accesses their store ===');
  const storeAccess = await request(`/api/business/${vendorId}`, {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  console.log(`Status: ${storeAccess.status}`);
  console.log('Body:', JSON.stringify(storeAccess.body).substring(0, 200));

  // Step 6: Admin rejects the approved vendor
  console.log('\n=== Step 6: Admin rejects the vendor ===');
  const reject = await request('/api/admin/registrations/test-pending-vendor/status', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: { status: 'Rejected' },
  });
  console.log(`Status: ${reject.status}`);

  // Step 7: Rejected vendor can no longer access their store (token still valid but backend checks status)
  console.log('\n=== Step 7: Rejected vendor tries to access store (should be denied) ===');
  const deniedAccess = await request(`/api/business/${vendorId}`, {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  console.log(`Status: ${deniedAccess.status}`);
  console.log('Body:', JSON.stringify(deniedAccess.body));

  // Step 8: Rejected vendor's session check also fails
  console.log('\n=== Step 8: Rejected vendor session check (should be denied) ===');
  const sessionCheck = await request('/api/vendor/session', {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  console.log(`Status: ${sessionCheck.status}`);
  console.log('Body:', JSON.stringify(sessionCheck.body));

  // Step 9: Admin re-approves the vendor
  console.log('\n=== Step 9: Admin re-approves the vendor ===');
  await request('/api/admin/registrations/test-pending-vendor/status', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: { status: 'Approved' },
  });

  console.log('\n=== ALL APPROVAL FLOW TESTS COMPLETE ===\n');
}

run().catch(console.error);
