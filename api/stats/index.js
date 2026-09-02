import { getRegistrationStats } from '../../server/models/registrationModel.js';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const stats = getRegistrationStats();
    return res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
}
