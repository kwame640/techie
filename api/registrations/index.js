export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const { getAllRegistrations, getRegistrationById, updateRegistrationStatus } = await import('../../server/models/registrationModelKV.js');
    const { getImagesByRegistrationId } = await import('../../server/models/businessImageModel.js');

    if (req.method === 'GET') {
      const { id } = req.query;
      if (id) {
        const registration = await getRegistrationById(id);
        if (!registration) return res.status(404).json({ success: false, error: 'Not found' });
        const images = getImagesByRegistrationId(id);
        return res.status(200).json({ success: true, registration: { ...registration, images } });
      }
      const registrations = await getAllRegistrations();
      const withCount = registrations.map(reg => ({
        ...reg,
        imageCount: getImagesByRegistrationId(reg.id).length,
      }));
      return res.status(200).json({ success: true, registrations: withCount });
    }

    if (req.method === 'PATCH') {
      const { id } = req.query;
      const { status } = req.body || {};
      if (!id || !status) return res.status(400).json({ success: false, error: 'id and status required' });
      const updated = await updateRegistrationStatus(id, status);
      if (!updated) return res.status(404).json({ success: false, error: 'Not found' });
      return res.status(200).json({ success: true, registration: updated });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Registrations API error:', error);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
}
