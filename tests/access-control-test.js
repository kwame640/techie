import http from 'http';

const BASE = 'http://127.0.0.1:3001';

function request(path, options = {}) {
  const body = options.body;
  const headers = options.headers || {};
  if (body) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
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
  console.log('\n=== A. Pending vendor login ===');
  const pending = await request('/api/vendor/login', {
    method: 'POST',
    body: { businessName: 'Test Pending Vendor', email: 'pending@test.com' },
  });
  console.log(`Status: ${pending.status}`);
  console.log('Body:', JSON.stringify(pending.body));

  console.log('\n=== B. Rejected vendor login ===');
  const rejected = await request('/api/vendor/login', {
    method: 'POST',
    body: { businessName: 'Test Rejected Vendor', email: 'rejected@test.com' },
  });
  console.log(`Status: ${rejected.status}`);
  console.log('Body:', JSON.stringify(rejected.body));

  console.log('\n=== C. Approved vendor login ===');
  const approved = await request('/api/vendor/login', {
    method: 'POST',
    body: { businessName: 'Test Approved Vendor', email: 'approved@test.com' },
  });
  console.log(`Status: ${approved.status}`);
  console.log('Body:', JSON.stringify(approved.body).substring(0, 200));

  const token = approved.body?.token;
  const vendorId = approved.body?.registration?.id;
  console.log(`\nToken: ${token ? token.substring(0, 40) + '...' : 'none'}`);
  console.log(`Vendor ID: ${vendorId}`);

  // --- Test session verification ---
  console.log('\n=== Session verification (approved vendor) ===');
  const session = await request('/api/vendor/session', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`Status: ${session.status}`);
  console.log('Body:', JSON.stringify(session.body).substring(0, 200));

  // --- Test session without token ---
  console.log('\n=== D. Session without token (logged out) ===');
  const noToken = await request('/api/vendor/session');
  console.log(`Status: ${noToken.status}`);
  console.log('Body:', JSON.stringify(noToken.body));

  // --- Test session with invalid token ---
  console.log('\n=== Session with invalid token ===');
  const invalid = await request('/api/vendor/session', {
    headers: { Authorization: 'Bearer invalidtoken123' },
  });
  console.log(`Status: ${invalid.status}`);
  console.log('Body:', JSON.stringify(invalid.body));

  // --- Test accessing business data with valid token (own ID) ---
  console.log('\n=== E. GET /api/business/:id with valid token (own ID) ===');
  const ownData = await request(`/api/business/${vendorId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`Status: ${ownData.status}`);
  console.log('Body:', JSON.stringify(ownData.body).substring(0, 300));

  // --- Test accessing business data with valid token (another vendor's ID) ---
  console.log('\n=== F. GET /api/business/:id with valid token (another vendor ID) ===');
  const otherData = await request('/api/business/test-pending-vendor', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`Status: ${otherData.status}`);
  console.log('Body:', JSON.stringify(otherData.body));

  // --- Test accessing business data without token ---
  console.log('\n=== G. GET /api/business/:id without token ===');
  const noAuth = await request(`/api/business/${vendorId}`);
  console.log(`Status: ${noAuth.status}`);
  console.log('Body:', JSON.stringify(noAuth.body));

  // --- Test admin login still works ---
  console.log('\n=== H. Admin login still works ===');
  const adminLogin = await request('/api/admin/login', {
    method: 'POST',
    body: { email: 'admin@nkay.com', password: 'nkayadmin123' },
  });
  console.log(`Status: ${adminLogin.status}`);
  console.log('Body:', JSON.stringify(adminLogin.body).substring(0, 200));

  // --- Test admin can view registrations ---
  if (adminLogin.body?.token) {
    console.log('\n=== Admin views registrations ===');
    const regs = await request('/api/admin/registrations', {
      headers: { Authorization: `Bearer ${adminLogin.body.token}` },
    });
    console.log(`Status: ${regs.status}`);
    const regsWithStatus = (regs.body?.registrations || []).map((r) => ({
      id: r.id,
      businessName: r.businessName,
      status: r.status,
    }));
    console.log('Registrations:', JSON.stringify(regsWithStatus, null, 2));
  }

  console.log('\n=== ALL TESTS COMPLETE ===\n');
}

run().catch(console.error);
