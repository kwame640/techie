import { createRegistration } from '../../server/models/registrationModel.js';
import { createBusinessImage } from '../../server/models/businessImageModel.js';
import { processAndSaveImage } from '../../server/services/imageService.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const businessData = req.body;

    const requiredFields = ['businessName', 'businessType', 'businessCategory', 'email', 'preferredContactMethod'];
    for (const field of requiredFields) {
      if (!businessData[field]) {
        return res.status(400).json({ success: false, error: `Missing required field: ${field}` });
      }
    }

    if (businessData.phone) {
      const digitsOnly = businessData.phone.replace(/\D/g, '');
      if (digitsOnly.length !== 10) {
        return res.status(400).json({ success: false, error: 'Phone number must be exactly 10 digits' });
      }
    }

    const registrationData = {
      businessName: businessData.businessName,
      businessType: businessData.businessType,
      businessCategory: businessData.businessCategory,
      email: businessData.email,
      phone: businessData.phone || '',
      address: businessData.address || '',
      city: businessData.city || '',
      region: businessData.region || '',
      country: businessData.country || '',
      preferredContactMethod: businessData.preferredContactMethod,
      description: businessData.description || '',
    };

    const savedRegistration = createRegistration(registrationData);

    return res.status(200).json({
      success: true,
      message: 'Business registration submitted successfully',
      registrationId: savedRegistration.id,
      imageCount: 0
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process registration' });
  }
}
