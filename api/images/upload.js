import { createBusinessImage, getImagesByRegistrationId } from '../../../server/models/businessImageModel.js';
import { getRegistrationById } from '../../../server/models/registrationModel.js';
import { processAndSaveImage } from '../../../server/services/imageService.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { registrationId, images } = req.body || {};

    if (!registrationId) {
      return res.status(400).json({ success: false, error: 'registrationId is required' });
    }

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ success: false, error: 'images array is required' });
    }

    const registration = getRegistrationById(registrationId);
    if (!registration) {
      return res.status(404).json({ success: false, error: 'Registration not found' });
    }

    const existing = getImagesByRegistrationId(registrationId);
    if (existing.length + images.length > 20) {
      return res.status(400).json({ success: false, error: 'Maximum 20 images per registration' });
    }

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const uploaded = [];

    for (const item of images) {
      if (!item.dataUrl || !item.name || !item.type) {
        return res.status(400).json({ success: false, error: 'Each image needs dataUrl, name, and type' });
      }
      if (!allowed.includes(item.type)) {
        return res.status(400).json({ success: false, error: `Unsupported file type: ${item.type}` });
      }

      const match = item.dataUrl.match(/^data:(.+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ success: false, error: 'Invalid dataUrl format' });
      }
      const buffer = Buffer.from(match[2], 'base64');

      const result = await processAndSaveImage(buffer, item.name, item.type);
      const saved = createBusinessImage({
        businessRegistrationId: registrationId,
        imageUrl: result.imageUrl,
        imageKey: result.imageKey,
        originalName: item.name,
      });
      uploaded.push(saved);
    }

    return res.status(200).json({
      success: true,
      message: `${uploaded.length} image(s) uploaded successfully`,
      images: uploaded,
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return res.status(500).json({ success: false, error: 'Failed to upload images' });
  }
}
