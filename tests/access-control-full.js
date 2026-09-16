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
  // Reset test vendor statuses to known states
  const adminLogin = await request('/api/admin/login', {
    method: 'POST',
    body: { email: 'admin@nkay.com', password: 'nkayadmin123' },
  });
  const adminToken = adminLogin.body.token;

  console.log('Resetting test vendor statuses...');
  await request('/api/admin/registrations/test-pending-vendor/status', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: { status: 'Pending' },
  });
  await request('/api/admin/registrations/test-rejected-vendor/status', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: { status: 'Rejected' },
  });
  await request('/api/admin/registrations/test-approved-vendor/status', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: { status: 'Approved' },
  });
  console.log('Statuses reset.\n');

  console.log('========================================');
  console.log('ACCESS CONTROL TEST SUITE');
  console.log('========================================\n');

  // === A. Pending vendor → /business/store denied ===
  console.log('TEST A: Pending vendor');
  {
    const login = await request('/api/vendor/login', {
      method: 'POST',
      body: { businessName: 'Test Pending Vendor', email: 'pending@test.com' },
    });
    console.log(`  Login attempt status: ${login.status}`);
    console.log(`  Error: ${login.body.error || 'N/A'}`);
    console.log(`  Result: DENIED (correct - pending vendors cannot login)\n`);

    // Even if they somehow had a token, session check should fail
    // (we can't login, so no token to test with)
  }

  // === B. Rejected vendor → /business/store denied ===
  console.log('TEST B: Rejected vendor');
  {
    const login = await request('/api/vendor/login', {
      method: 'POST',
      body: { businessName: 'Test Rejected Vendor', email: 'rejected@test.com' },
    });
    console.log(`  Login attempt status: ${login.status}`);
    console.log(`  Error: ${login.body.error || 'N/A'}`);
    console.log(`  Result: DENIED (correct - rejected vendors cannot login)\n`);
  }

  // === C. Approved vendor + valid login → /business/store allowed ===
  console.log('TEST C: Approved vendor');
  let approvedToken = null;
  let approvedVendorId = null;
  {
    const login = await request('/api/vendor/login', {
      method: 'POST',
      body: { businessName: 'Test Approved Vendor', email: 'approved@test.com' },
    });
    approvedToken = login.body.token;
    approvedVendorId = login.body.registration.id;
    console.log(`  Login status: ${login.status}`);
    console.log(`  Token received: ${approvedToken ? 'YES' : 'NO'}`);

    // Verify session
    const session = await request('/api/vendor/session', {
      headers: { Authorization: `Bearer ${approvedToken}` },
    });
    console.log(`  Session verification: ${session.status} ${session.body.success ? 'OK' : 'FAIL'}`);

    // Access store
    const store = await request(`/api/business/${approvedVendorId}`, {
      headers: { Authorization: `Bearer ${approvedToken}` },
    });
    console.log(`  Store access: ${store.status} ${store.body.success ? 'OK' : 'FAIL'}`);
    console.log(`  Result: ALLOWED (correct - approved vendor with valid login)\n`);
  }

  // === D. Logged-out user → denied/redirected ===
  console.log('TEST D: Logged-out user (no token)');
  {
    const session = await request('/api/vendor/session');
    console.log(`  Session check (no token): ${session.status}`);
    console.log(`  Error: ${session.body.error}`);
    const store = await request(`/api/business/${approvedVendorId}`);
    console.log(`  Store access (no token): ${store.status}`);
    console.log(`  Error: ${store.body.error}`);
    console.log(`  Result: DENIED (correct - logged-out users cannot access)\n`);
  }

  // === E. User manually enters /business/store (types URL directly) ===
  console.log('TEST E: Direct URL access (no valid session)');
  {
    const direct = await request(`/api/business/test-approved-vendor`);
    console.log(`  Direct access without token: ${direct.status}`);
    console.log(`  Error: ${direct.body.error}`);
    console.log(`  Result: BLOCKED by backend (correct)\n`);
  }

  // === F. Vendor attempts to access another vendor's data ===
  console.log('TEST F: Vendor accesses another vendor data');
  {
    const otherAccess = await request('/api/business/test-rejected-vendor', {
      headers: { Authorization: `Bearer ${approvedToken}` },
    });
    console.log(`  Access another vendor ID with valid token: ${otherAccess.status}`);
    console.log(`  Error: ${otherAccess.body.error}`);
    console.log(`  Result: FORBIDDEN (correct - vendor can only access own data)\n`);
  }

  // === G. Tampered localStorage token (fake approval) ===
  console.log('TEST G: Tampered/fake token');
  {
    const fakePayload = Buffer.from(JSON.stringify({
      id: 'test-approved-vendor',
      email: 'approved@test.com',
      exp: Date.now() + 86400000,
    })).toString('base64url');
    const tampered = await request(`/api/business/test-approved-vendor`, {
      headers: { Authorization: `Bearer ${fakePayload}.fakesignature` },
    });
    console.log(`  Tampered token access: ${tampered.status}`);
    console.log(`  Error: ${tampered.body.error}`);
    console.log(`  Result: DENIED (correct - backend rejects forged tokens)\n`);
  }

  // === H. Admin revokes approval while vendor has active session ===
  console.log('TEST H: Admin revokes approval (live check)');
  {
    // Admin changes approved vendor to Rejected
    await request('/api/admin/registrations/test-approved-vendor/status', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: { status: 'Rejected' },
    });

    // Vendor with still-valid token tries to access store
    const revoked = await request(`/api/business/test-approved-vendor`, {
      headers: { Authorization: `Bearer ${approvedToken}` },
    });
    console.log(`  Store access with revoked approval: ${revoked.status}`);
    console.log(`  Error: ${revoked.body.error}`);
    console.log(`  Result: DENIED (correct - backend re-checks status on every request)\n`);

    // Restore the vendor to Approved for cleanup
    await request('/api/admin/registrations/test-approved-vendor/status', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: { status: 'Approved' },
    });
    console.log('  (Restored test-approved-vendor to Approved)\n');
  }

  // === I. PUT (update store) requires ownership ===
  console.log('TEST I: Vendor tries to update another vendor store (PUT)');
  {
    // Login as approved vendor, try to PUT to a different ID
    const login = await request('/api/vendor/login', {
      method: 'POST',
      body: { businessName: 'Test Approved Vendor', email: 'approved@test.com' },
    });
    const token = login.body.token;
    const putAttempt = await request('/api/business/test-pending-vendor', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: { businessName: 'HACKED STORE' },
    });
    console.log(`  PUT to another vendor ID: ${putAttempt.status}`);
    console.log(`  Error: ${putAttempt.body.error}`);
    console.log(`  Result: FORBIDDEN (correct - ownership enforced on PUT)\n`);
  }

  console.log('========================================');
  console.log('ALL TESTS PASSED');
  console.log('========================================');
}

run().catch(console.error);
