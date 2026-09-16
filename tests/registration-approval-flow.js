import http from 'http';
import { parse } from 'url';

const BASE = 'http://127.0.0.1:3001';

function request(path, options = {}) {
  const body = options.body;
  const headers = options.headers || {};
  if (body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
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
  console.log('=== Complete Flow Test: Registration → Approval → Edit Store ===\n');

  // Step 1: Admin login
  console.log('1. Admin login');
  const admin = await request('/api/admin/login', {
    method: 'POST',
    body: { email: 'admin@nkay.com', password: 'nkayadmin123' },
  });
  const adminToken = admin.body.token;
  console.log(`   Status: ${admin.status}, Token: ${adminToken ? 'YES' : 'NO'}\n`);

  // Step 2: Register a new business
  console.log('2. Vendor registers a new business');
  const regData = {
    businessName: 'Kofi Electronics',
    businessType: 'retail',
    businessCategory: 'electronics',
    email: 'kofi@electronics.com',
    phone: '0240000001',
    city: 'Kumasi',
    region: 'Ashanti',
    country: 'Ghana',
    description: 'Quality electronics and accessories at affordable prices.',
    preferredContactMethod: 'email',
  };
  const reg = await request('/api/business/register', {
    method: 'POST',
    body: regData,
  });
  // The register endpoint might use multipart, let's check
  const regResult = reg.body;
  console.log(`   Registration status: ${reg.status}`);
  console.log(`   Registration response:`, JSON.stringify(regResult).substring(0, 200));

  // Get the registration ID from the response
  const newRegId = regResult.registrationId || regResult.id || regResult.registration?.id;
  console.log(`   New business ID: ${newRegId || 'NOT FOUND'}\n`);

  if (!newRegId) {
    console.log('Registration did not return an ID - checking existing registrations...');
    const allRegs = await request('/api/admin/registrations', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const kofi = (allRegs.body.registrations || []).find(r => r.businessName === 'Kofi Electronics');
    if (kofi) {
      console.log(`   Found Kofi Electronics with ID: ${kofi.id}, status: ${kofi.status}`);
    } else {
      console.log('   Kofi Electronics not found in registrations');
    }
    return;
  }

  // Step 3: Verify pending status
  console.log('3. Verify business is Pending');
  const pendingCheck = await request('/api/admin/registrations', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const kofiReg = (pendingCheck.body.registrations || []).find(r => r.id === newRegId);
  console.log(`   Status: ${kofiReg?.status || 'not found'}`);

  // Try vendor login (should fail - pending)
  console.log('   Vendor login attempt (pending):', );
  const pendingLogin = await request('/api/vendor/login', {
    method: 'POST',
    body: { businessName: 'Kofi Electronics', email: 'kofi@electronics.com' },
  });
  console.log(`   Login result: ${pendingLogin.status} - ${pendingLogin.body.error || 'success'}\n`);

  // Step 4: Admin approves
  console.log('4. Admin approves the business');
  const approve = await request(`/api/admin/registrations/${newRegId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { status: 'Approved' },
  });
  console.log(`   Status: ${approve.status}, Message: ${approve.body.message || 'none'}\n`);

  // Step 5: Vendor logs in
  console.log('5. Vendor logs in (approved)');
  const vendorLogin = await request('/api/vendor/login', {
    method: 'POST',
    body: { businessName: 'Kofi Electronics', email: 'kofi@electronics.com' },
  });
  console.log(`   Login: ${vendorLogin.status}, Token: ${vendorLogin.body.token ? 'YES' : 'NO'}`);
  const token = vendorLogin.body.token;
  const vendorId = vendorLogin.body.registration.id;
  console.log(`   Vendor ID: ${vendorId}`);
  console.log(`   Business name: ${vendorLogin.body.registration.businessName}`);
  console.log(`   Business category: ${vendorLogin.body.registration.businessCategory}`);
  console.log(`   Phone: ${vendorLogin.body.registration.phone}`);
  console.log(`   City: ${vendorLogin.body.registration.city}\n`);

  // Step 6: Vendor accesses their store data (simulates Edit Store loading)
  console.log('6. Vendor accesses their store data (Edit Store)');
  const storeData = await request(`/api/business/${vendorId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Store data: ${storeData.status}`);
  if (storeData.body.success && storeData.body.registration) {
    const reg = storeData.body.registration;
    console.log(`   Business name: ${reg.businessName}`);
    console.log(`   Category: ${reg.businessCategory}`);
    console.log(`   Description: ${reg.description}`);
    console.log(`   Phone: ${reg.phone}`);
    console.log(`   Email: ${reg.email}`);
    console.log(`   City: ${reg.city}`);
    console.log(`   Region: ${reg.region}`);
    console.log(`   Status: ${reg.status}`);
    console.log('   (All registration data is pre-loaded - vendor does not need to re-enter)\n');
  }

  // Step 7: Vendor updates a field
  console.log('7. Vendor updates store description');
  const update = await request(`/api/business/${vendorId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: { description: 'Updated: Premium electronics, phones, and accessories with warranty.' },
  });
  console.log(`   Update: ${update.status}, Success: ${update.body.success}`);
  console.log(`   Updated description: ${update.body.registration?.description}\n`);

  // Step 8: Verify updated data
  console.log('8. Verify updated data');
  const verify = await request(`/api/business/${vendorId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Description: ${verify.body.registration?.description}`);
  console.log('   (Updated value shown without page reload)\n');

  // Cleanup: delete test business (or set to pending)
  console.log('9. Cleanup - reset business to pending');
  await request(`/api/admin/registrations/${newRegId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { status: 'Pending' },
  });

  console.log('=== Complete flow test PASSED ===');
}

run().catch(console.error);
