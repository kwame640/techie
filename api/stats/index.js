export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const { getRegistrationStats } = await import('../../server/models/githubStorage.js');
    const stats = await getRegistrationStats();
    return res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
}
