import { sendBusinessRegistrationEmail } from '../services/emailService.js';
import { createRegistration } from '../models/registrationModel.js';
import { createBusinessImage, deleteImagesByRegistrationId } from '../models/businessImageModel.js';
import { processAndSaveImage, deleteImage } from '../services/imageService.js';

export const registerBusiness = async (req, res) => {
  let savedRegistration = null;
  let uploadedImages = [];

  try {
    const businessData = req.body;
    const files = req.files || [];

    const requiredFields = [
      'businessName',
      'businessType',
      'businessCategory',
      'email',
      'preferredContactMethod'
    ];

    for (const field of requiredFields) {
      if (!businessData[field]) {
        return res.status(400).json({ 
          success: false, 
          error: `Missing required field: ${field}` 
        });
      }
    }

    if (businessData.phone) {
      const digitsOnly = businessData.phone.replace(/\D/g, '');
      if (digitsOnly.length !== 10) {
        return res.status(400).json({ 
          success: false, 
          error: 'Phone number must be exactly 10 digits' 
        });
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

    try {
      savedRegistration = createRegistration(registrationData);
      console.log('Registration saved to database with ID:', savedRegistration.id);
    } catch (dbError) {
      console.error('Failed to save registration to database:', dbError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to save registration. Please try again.' 
      });
    }

    if (files.length > 0) {
      for (const file of files) {
        try {
          const imageResult = await processAndSaveImage(file.buffer, file.originalname);
          uploadedImages.push(imageResult);

          createBusinessImage({
            businessRegistrationId: savedRegistration.id,
            imageUrl: imageResult.url,
            imageKey: imageResult.filename,
            originalName: file.originalname,
          });
        } catch (imgError) {
          console.error('Failed to process image:', imgError);
        }
      }
    }

    await sendBusinessRegistrationEmail(businessData);

    res.status(200).json({ 
      success: true, 
      message: 'Business registration submitted successfully',
      registrationId: savedRegistration.id,
      imageCount: uploadedImages.length
    });

  } catch (error) {
    console.error('Registration error:', error);

    if (savedRegistration && uploadedImages.length > 0) {
      for (const img of uploadedImages) {
        await deleteImage(img.filename);
      }
      deleteImagesByRegistrationId(savedRegistration.id);
    }

    res.status(500).json({ 
      success: false, 
      error: 'Failed to process registration' 
    });
  }
};
