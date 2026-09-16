import { verifyVendorToken } from '../services/vendorSession.js';
import { getRegistrationById } from '../models/firestoreRegistrationModel.js';

const normalizeStatus = (status) => String(status || '').toLowerCase();

export const authenticateVendor = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in.',
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token.',
    });
  }

  try {
    const payload = verifyVendorToken(token);
    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please log in again.',
      });
    }

    const registration = await getRegistrationById(payload.id);
    if (!registration) {
      return res.status(401).json({
        success: false,
        error: 'Vendor account not found.',
      });
    }

    const currentStatus = normalizeStatus(registration.status);

    if (currentStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        error: 'Your vendor account is not approved. Access denied.',
        status: registration.status,
      });
    }

    req.vendor = registration;
    next();
  } catch (error) {
    console.error('Vendor auth error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session. Please log in again.',
    });
  }
};

export const requireVendorOwnership = (req, res, next) => {
  const { id } = req.params;
  if (!req.vendor) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  if (id !== req.vendor.id) {
    return res.status(403).json({ success: false, error: 'Access denied. You can only manage your own store.' });
  }
  next();
};
