import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { registerBusiness } from './controllers/businessController.js';
import { getRegistrations, getRegistration, updateStatus, getStats, adminLogin, deleteImage } from './controllers/adminController.js';
import { authenticateAdmin } from './middleware/auth.js';
import { uploadBusinessImages } from './services/imageService.js';
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

// Business registration route with image upload
app.post('/api/business/register', uploadBusinessImages.array('businessImages', 5), registerBusiness);

// Admin routes
app.post('/api/admin/login', adminLogin);
app.get('/api/admin/registrations', authenticateAdmin, getRegistrations);
app.get('/api/admin/registrations/:id', authenticateAdmin, getRegistration);
app.patch('/api/admin/registrations/:id/status', authenticateAdmin, updateStatus);
app.get('/api/admin/stats', authenticateAdmin, getStats);
app.delete('/api/admin/images/:id', authenticateAdmin, deleteImage);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((error, req, res, next) => {
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
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
