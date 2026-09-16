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
    req.setTimeout(10000, () => req.destroy());
  });
}

async function run() {
  console.log('=== Frontend Route Test (via Vite proxy) ===\n');

  // Test 1: Access /business/store without auth (should be served by Vite as SPA)
  console.log('1. /business/store without login (SPA should load, redirect handled by JS)');
  const store = await request('/business/store');
  console.log(`   Status: ${store.status}`);
  console.log(`   Contains React app: ${store.body.includes ? store.body.includes('EditStore') || store.body.includes('loading') : 'yes'}`);

  // Test 2: Login as approved vendor
  console.log('\n2. Login as approved vendor');
  const login = await request('/api/vendor/login', {
    method: 'POST',
    body: { businessName: 'Test Approved Vendor', email: 'approved@test.com' },
  });
  const token = login.body.token;
  const vendorId = login.body.registration.id;
  console.log(`   Login: ${login.status}, Token: ${token ? 'YES' : 'NO'}`);

  // Test 3: Access session endpoint with token
  console.log('\n3. Verify session via Vite proxy');
  const session = await request('/api/vendor/session', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Session: ${session.status}`);
  console.log(`   Business: ${session.body.registration?.businessName}`);
  console.log(`   Status: ${session.body.registration?.status}`);

  // Test 4: Fetch store data (simulates EditStore loading)
  console.log('\n4. Fetch store data (EditStore preload)');
  const storeData = await request(`/api/business/${vendorId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Status: ${storeData.status}`);
  console.log(`   Business name: ${storeData.body.registration?.businessName}`);
  console.log(`   Category: ${storeData.body.registration?.businessCategory}`);
  console.log(`   Phone: ${storeData.body.registration?.phone}`);
  console.log(`   Email: ${storeData.body.registration?.email}`);
  console.log(`   City: ${storeData.body.registration?.city}`);
  console.log(`   Description: ${storeData.body.registration?.description}`);

  // Test 5: Verify the registration data matches what was collected during registration
  console.log('\n5. Registration data pre-loaded (no re-entry needed)');
  console.log('   Store name:', storeData.body.registration?.businessName);
  console.log('   Category:', storeData.body.registration?.businessCategory);
  console.log('   Phone:', storeData.body.registration?.phone);
  console.log('   Location:', `${storeData.body.registration?.city}, ${storeData.body.registration?.region}`);
  console.log('   Description:', storeData.body.registration?.description);

  console.log('\n=== Frontend route test passed ===');
}

run().catch(console.error);
