import { getAllRegistrations } from '../../server/models/firestoreRegistrationModel.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const businessName = String(req.query.businessName || '').trim().toLowerCase();
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!businessName || !email) return res.status(400).json({ success: false, error: 'Business name and email are required.' });

  try {
    const registrations = await getAllRegistrations();
    const registration = registrations
      .filter((entry) => (
        String(entry.businessName || '').trim().toLowerCase() === businessName &&
        String(entry.email || '').trim().toLowerCase() === email
      ))
      .sort((first, second) => {
        if (first.status === 'Approved' && second.status !== 'Approved') return -1;
        if (second.status === 'Approved' && first.status !== 'Approved') return 1;
        return String(second.registrationDate || '').localeCompare(String(first.registrationDate || ''));
      })[0];

    return res.status(200).json({
      success: true,
      registration: registration ? {
        id: registration.id,
        email: registration.email,
        businessName: registration.businessName,
        businessCategory: registration.businessCategory,
        phone: registration.phone,
        city: registration.city,
        region: registration.region,
        description: registration.description,
        status: registration.status,
      } : null,
    });
  } catch (error) {
    console.error('Business access lookup error:', error);
    return res.status(500).json({ success: false, error: 'Unable to check vendor access.' });
  }
}
