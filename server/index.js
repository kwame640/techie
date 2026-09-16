import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { registerBusiness } from './controllers/businessController.js';
import { getRegistrations, getRegistration, updateStatus, getStats, adminLogin, deleteImage, uploadImage, getPublicRegistrations, getPublicRegistration } from './controllers/adminController.js';
import { subscribe, unsubscribe, sendNotification, sendTestNotification } from './controllers/pushController.js';
import { authenticateAdmin } from './middleware/auth.js';
import { authenticateVendor, requireVendorOwnership } from './middleware/vendorAuth.js';
import { createVendorToken, verifyVendorToken } from './services/vendorSession.js';
import { uploadBusinessImages, processAndSaveImage } from './services/imageService.js';
import { getAllRegistrations, getRegistrationById, updateRegistration, createRegistration, createRegistrationWithId } from './models/firestoreRegistrationModel.js';
import { getImagesByRegistrationId } from './models/businessImageModel.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL ? 'Configured' : 'Not configured');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Business registration route (public - creates a Pending registration)
app.post('/api/business/register', uploadBusinessImages.array('businessImages', 5), registerBusiness);

// ---------------------------------------------------------------------------
// Vendor authentication & session management
// ---------------------------------------------------------------------------

// POST /api/vendor/login
// Authenticates a vendor by businessName + email against the registration DB.
// Only Approved businesses receive a signed session token.
app.post('/api/vendor/login', async (req, res) => {
  const businessName = String(req.body?.businessName || '').trim().toLowerCase();
  const email = String(req.body?.email || '').trim().toLowerCase();

  if (!businessName || !email) {
    return res.status(400).json({ success: false, error: 'Business name and email are required.' });
  }

  try {
    const registrations = await getAllRegistrations();
    const registration = registrations.find((entry) => (
      String(entry.businessName || '').trim().toLowerCase() === businessName &&
      String(entry.email || '').trim().toLowerCase() === email
    ));

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: 'Business not found. Please check your business name and email.',
      });
    }

    const status = String(registration.status || '').toLowerCase();

    if (status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'Store Suspended. Please contact NKAY support.',
        status: registration.status,
      });
    }

    if (status !== 'approved') {
      const statusMessage =
        status === 'pending'
          ? 'Your vendor account is waiting for admin approval.'
          : 'Your vendor account has been rejected.';
      return res.status(403).json({
        success: false,
        error: statusMessage,
        status: registration.status,
      });
    }

    const token = createVendorToken(registration.id, registration.email || email);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      registration: {
        id: registration.id,
        email: registration.email || email,
        businessName: registration.businessName,
        businessType: registration.businessType,
        businessCategory: registration.businessCategory,
        phone: registration.phone || '',
        city: registration.city || '',
        region: registration.region || '',
        country: registration.country || '',
        description: registration.description || '',
        preferredContactMethod: registration.preferredContactMethod || '',
        status: registration.status,
        registrationDate: registration.registrationDate,
      },
    });
  } catch (error) {
    console.error('Vendor login error:', error);
    return res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
  }
});

// GET /api/vendor/session
// Verifies the current vendor session token and returns the business data.
// Enforces backend-side approval check on every request.
app.get('/api/vendor/session', authenticateVendor, (req, res) => {
  const reg = req.vendor;
  res.json({
    success: true,
    registration: {
      id: reg.id,
      email: reg.email,
      businessName: reg.businessName,
      businessType: reg.businessType,
      businessCategory: reg.businessCategory,
      phone: reg.phone || '',
      city: reg.city || '',
      region: reg.region || '',
      country: reg.country || '',
      description: reg.description || '',
      preferredContactMethod: reg.preferredContactMethod || '',
      status: reg.status,
      registrationDate: reg.registrationDate,
    },
  });
});

// ---------------------------------------------------------------------------
// Protected vendor store management
// All routes require a valid, approved vendor session token.
// Vendors can only access their OWN store data (ownership enforced).
// ---------------------------------------------------------------------------

// GET /api/business/:id — only the authenticated vendor can read their own store
app.get('/api/business/:id', authenticateVendor, requireVendorOwnership, async (req, res) => {
  const { id } = req.params;
  try {
    const registration = await getRegistrationById(id);
    if (!registration) {
      return res.status(404).json({ success: false, error: 'Store not found', id });
    }
    const images = getImagesByRegistrationId(id);
    res.json({ success: true, registration: { ...registration, images } });
  } catch (error) {
    console.error('Business access error:', error);
    res.status(500).json({ success: false, error: 'Unable to load store information.' });
  }
});

// PUT /api/business/:id — only the authenticated vendor can update their own store
app.put('/api/business/:id', authenticateVendor, requireVendorOwnership, async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await getRegistrationById(id);
    let updated;
    if (!existing) {
      updated = await createRegistrationWithId(id, { ...req.body, status: 'Approved' });
    } else {
      const updates = req.body || {};
      updated = await updateRegistration(id, updates);
    }
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }
    res.json({ success: true, registration: updated });
  } catch (error) {
    console.error('Business update error:', error);
    res.status(500).json({ success: false, error: 'Unable to update store information.' });
  }
});

// POST /api/business/:id/images — only the authenticated vendor can upload to their own store
app.post('/api/business/:id/images', authenticateVendor, requireVendorOwnership, uploadBusinessImages.single('image'), async (req, res) => {
  const { id } = req.params;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }
    const result = await processAndSaveImage(req.file.buffer, req.file.originalname);
    res.json({ success: true, url: result.url, filename: result.filename });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload image' });
  }
});

// GET /api/business/access — lookup registration by email + businessName (returns status for display)
app.get('/api/business/access', async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  const businessName = String(req.query.businessName || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ success: false, error: 'Email is required.' });
  if (!businessName) return res.status(400).json({ success: false, error: 'Business name is required.' });

  try {
    const registrations = await getAllRegistrations();
    const matches = registrations
      .filter((entry) => (
        String(entry.email || '').trim().toLowerCase() === email &&
        String(entry.businessName || '').trim().toLowerCase() === businessName
      ))
      .sort((first, second) => {
        if (first.status === 'Approved' && second.status !== 'Approved') return -1;
        if (second.status === 'Approved' && first.status !== 'Approved') return 1;
        return String(second.registrationDate || '').localeCompare(String(first.registrationDate || ''));
      });
    const registration = matches[0];
    return res.json({
      success: true,
      registration: registration ? {
        id: registration.id,
        email: registration.email,
        businessName: registration.businessName,
        businessCategory: registration.businessCategory,
        phone: registration.phone,
        city: registration.city,
        region: registration.region,
        description: registration.description,
        status: registration.status,
      } : null,
    });
  } catch (error) {
    console.error('Business access lookup error:', error);
    return res.status(500).json({ success: false, error: 'Unable to check vendor access.' });
  }
});

// Admin routes
app.get('/api/registrations', getPublicRegistrations);
app.get('/api/registrations/:id', getPublicRegistration);
app.post('/api/admin/login', adminLogin);
app.get('/api/admin/registrations', authenticateAdmin, getRegistrations);
app.get('/api/admin/registrations/:id', authenticateAdmin, getRegistration);
app.patch('/api/admin/registrations/:id/status', authenticateAdmin, updateStatus);
app.get('/api/admin/stats', authenticateAdmin, getStats);
app.delete('/api/admin/images/:id', authenticateAdmin, deleteImage);
app.post('/api/admin/images/upload', authenticateAdmin, uploadImage);

app.post('/api/push/subscribe', subscribe);
app.post('/api/push/unsubscribe', unsubscribe);
app.post('/api/push/send', authenticateAdmin, sendNotification);
app.post('/api/push/test', sendTestNotification);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// 404 catch-all: always return JSON (never HTML)
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.url} not found` });
});

// Error handling middleware – always respond with JSON and the real error
app.use((error, req, res, _next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: error.message });
  }
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, error: 'File too large. Maximum 5MB per image.' });
  }
  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ success: false, error: 'Too many files. Maximum 5 images allowed.' });
  }
  if (error.message && error.message.includes('Invalid file type')) {
    return res.status(400).json({ success: false, error: error.message });
  }
  console.error('Server error:', error);
  const statusCode = error.statusCode || error.status || 500;
  res.status(statusCode).json({ success: false, error: error.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
