import { getAllRegistrations, getRegistrationById, updateRegistrationStatus, getRegistrationStats } from '../models/registrationModel.js';
import { getImageById, deleteImage as deleteImageFromDb, getImagesByRegistrationId } from '../models/businessImageModel.js';
import { deleteImage as deleteImageFile } from '../services/imageService.js';

export const getRegistrations = async (req, res) => {
  try {
    const registrations = getAllRegistrations();
    const registrationsWithImageCount = registrations.map(reg => {
      const images = getImagesByRegistrationId(reg.id);
      return {
        ...reg,
        imageCount: images.length
      };
    });
    res.status(200).json({ 
      success: true, 
      registrations: registrationsWithImageCount 
    });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch registrations' 
    });
  }
};

export const getRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const registration = getRegistrationById(id);
    
    if (!registration) {
      return res.status(404).json({ 
        success: false, 
        error: 'Registration not found' 
      });
    }

    const images = getImagesByRegistrationId(id);

    res.status(200).json({ 
      success: true, 
      registration: {
        ...registration,
        images
      }
    });
  } catch (error) {
    console.error('Error fetching registration:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch registration' 
    });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status. Must be Pending, Approved, or Rejected.' 
      });
    }

    const updated = updateRegistrationStatus(id, status);
    
    if (!updated) {
      return res.status(404).json({ 
        success: false, 
        error: 'Registration not found' 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Status updated successfully',
      registration: updated 
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update status' 
    });
  }
};

export const getStats = async (req, res) => {
  try {
    const stats = getRegistrationStats();
    res.status(200).json({ 
      success: true, 
      stats 
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch stats' 
    });
  }
};

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return res.status(500).json({ 
        success: false, 
        error: 'Admin credentials not configured' 
      });
    }

    if (email === adminEmail && password === adminPassword) {
      const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
      
      res.status(200).json({ 
        success: true, 
        message: 'Login successful',
        token,
        admin: { email }
      });
    } else {
      res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Login failed' 
    });
  }
};

export const deleteImage = async (req, res) => {
  try {
    const { id } = req.params;
    
    const image = getImageById(id);
    if (!image) {
      return res.status(404).json({ 
        success: false, 
        error: 'Image not found' 
      });
    }

    await deleteImageFile(image.imageKey);
    deleteImageFromDb(id);

    res.status(200).json({ 
      success: true, 
      message: 'Image deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete image' 
    });
  }
};
