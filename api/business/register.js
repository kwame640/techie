import formidable from 'formidable';
import { createRegistration } from '../../server/models/registrationModel.js';
import { createBusinessImage } from '../../server/models/businessImageModel.js';
import { processAndSaveImage } from '../../server/services/imageService.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: true, maxFiles: 20 });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

function getField(fields, key) {
  const v = fields[key];
  if (Array.isArray(v)) return v[0];
  return v || '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { fields, files } = await parseForm(req);

    const businessName = getField(fields, 'businessName');
    const businessType = getField(fields, 'businessType');
    const businessCategory = getField(fields, 'businessCategory');
    const email = getField(fields, 'email');
    const preferredContactMethod = getField(fields, 'preferredContactMethod');

    if (!businessName || !businessType || !businessCategory || !email || !preferredContactMethod) {
      return res.status(400).json({ success: false, error: 'Missing required field' });
    }

    const phone = getField(fields, 'phone');
    if (phone) {
      const digitsOnly = phone.replace(/\D/g, '');
      if (digitsOnly.length !== 10) {
        return res.status(400).json({ success: false, error: 'Phone number must be exactly 10 digits' });
      }
    }

    const registrationData = {
      businessName,
      businessType,
      businessCategory,
      email,
      phone,
      address: getField(fields, 'address'),
      city: getField(fields, 'city'),
      region: getField(fields, 'region'),
      country: getField(fields, 'country'),
      preferredContactMethod,
      description: getField(fields, 'description'),
    };

    const savedRegistration = createRegistration(registrationData);

    const fileList = files.images
      ? (Array.isArray(files.images) ? files.images : [files.images])
      : [];

    let imageCount = 0;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

    for (const f of fileList) {
      if (!allowed.includes(f.mimetype)) continue;
      const fs = await import('fs');
      const buffer = fs.readFileSync(f.filepath);
      const result = await processAndSaveImage(buffer, f.originalFilename || 'image', f.mimetype);
      createBusinessImage({
        businessRegistrationId: savedRegistration.id,
        imageUrl: result.imageUrl,
        imageKey: result.imageKey,
        originalName: f.originalFilename || 'image',
      });
      imageCount++;
    }

    return res.status(200).json({
      success: true,
      message: 'Business registration submitted successfully',
      registrationId: savedRegistration.id,
      imageCount,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process registration' });
  }
}
