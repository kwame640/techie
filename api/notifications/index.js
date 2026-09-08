export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const {
      getAllNotifications,
      getUnreadCount,
      markAsRead,
      markAllAsRead,
      deleteNotification,
    } = await import('../../server/models/notificationStorage.js');

    if (req.method === 'GET') {
      const { unread, markRead } = req.query;

      if (unread === 'true') {
        const count = await getUnreadCount();
        return res.status(200).json({ success: true, count });
      }

      if (markRead === 'true') {
        const updated = await markAllAsRead();
        return res.status(200).json({ success: true, notifications: updated });
      }

      const notifications = await getAllNotifications();
      return res.status(200).json({ success: true, notifications });
    }

    if (req.method === 'POST') {
      const { id } = req.query;
      if (id) {
        const updated = await markAsRead(id);
        return res.status(200).json({ success: true, notification: updated });
      }
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ success: false, error: 'id required' });
      await deleteNotification(id);
      return res.status(200).json({ success: true, message: 'Deleted' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Notification API error:', error);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
}
