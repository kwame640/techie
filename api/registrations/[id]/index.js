import { getRegistrationById, updateRegistrationStatus } from '../../../server/models/registrationModel.js';
import { getImagesByRegistrationId } from '../../../server/models/businessImageModel.js';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      const registration = getRegistrationById(id);
      if (!registration) {
        return res.status(404).json({ success: false, error: 'Registration not found' });
      }
      const images = getImagesByRegistrationId(id);
      return res.status(200).json({ success: true, registration: { ...registration, images } });
    }

    if (req.method === 'PATCH') {
      const { status } = req.body;
      if (!status || !['Pending', 'Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }
      const updated = updateRegistrationStatus(id, status);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Registration not found' });
      }
      return res.status(200).json({ success: true, message: 'Status updated', registration: updated });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
