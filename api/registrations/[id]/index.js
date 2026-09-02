export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { id } = req.query;

  try {
    const { getRegistrationById, updateRegistrationStatus } = await import('../../../server/models/githubStorage.js');

    if (req.method === 'GET') {
      const registration = await getRegistrationById(id);
      if (!registration) {
        return res.status(404).json({ success: false, error: 'Registration not found' });
      }
      return res.status(200).json({ success: true, registration: { ...registration, images: [] } });
    }

    if (req.method === 'PATCH') {
      const { status } = req.body || {};
      if (!status || !['Pending', 'Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }
      const updated = await updateRegistrationStatus(id, status);
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
