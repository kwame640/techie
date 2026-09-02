import { getAllRegistrations, getRegistrationById, updateRegistrationStatus, getRegistrationStats } from '../../server/models/registrationModel.js';
import { getImagesByRegistrationId } from '../../server/models/businessImageModel.js';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const registrations = getAllRegistrations();
    const registrationsWithImageCount = registrations.map(reg => {
      const images = getImagesByRegistrationId(reg.id);
      return { ...reg, imageCount: images.length };
    });
    return res.status(200).json({ success: true, registrations: registrationsWithImageCount });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch registrations' });
  }
}
