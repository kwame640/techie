import webpush from 'web-push';
import { getByEmail, save as saveSubscription, removeByEmail, getAll } from '../models/pushSubscription.js';
import { getRegistrationByEmail } from '../models/registrationModel.js';

let vapidConfigured = false;

function configureVapid() {
  if (vapidConfigured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY || '';
  const privateKey = process.env.VAPID_PRIVATE_KEY || '';
  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys are not configured on the server');
  }
  webpush.setVapidDetails('mailto:admin@nkay.com', publicKey, privateKey);
  vapidConfigured = true;
}

export const subscribe = async (req, res) => {
  try {
    const { email, subscription } = req.body;
    if (!email || !subscription) {
      return res.status(400).json({ success: false, error: 'Email and subscription are required' });
    }
    const saved = saveSubscription({
      email,
      endpoint: subscription.endpoint,
      keys: subscription.keys || {},
      p256dh: subscription.keys?.p256dh || '',
      auth: subscription.keys?.auth || '',
    });
    res.status(200).json({ success: true, message: 'Subscription saved', subscription: saved });
  } catch (error) {
    console.error('Push subscribe error:', error);
    const statusCode = error?.statusCode || 500;
    res.status(statusCode).json({ success: false, error: error?.message || 'Failed to save subscription' });
  }
};

export const unsubscribe = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    removeByEmail(email);
    res.status(200).json({ success: true, message: 'Subscription removed' });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    const statusCode = error?.statusCode || 500;
    res.status(statusCode).json({ success: false, error: error?.message || 'Failed to remove subscription' });
  }
};

export const sendNotification = async (req, res) => {
  try {
    const { to, title, body, url } = req.body;
    if (!to || !title || !body) {
      return res.status(400).json({ success: false, error: 'to, title, and body are required' });
    }

    const sub = getByEmail(to);
    if (!sub) {
      return res.status(404).json({ success: false, error: 'No subscription found for this vendor' });
    }

    const registration = getRegistrationByEmail(to);
    if (!registration) {
      removeByEmail(to);
      return res.status(404).json({ success: false, error: 'Vendor not found, subscription removed' });
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url || '/business/dashboard',
      tag: `notif-${Date.now()}`,
    });

    configureVapid();
    await webpush.sendNotification(sub, payload);
    res.status(200).json({ success: true, message: 'Notification sent' });
  } catch (error) {
    console.error('Push send error:', error);
    const statusCode = error?.statusCode || 500;
    if (statusCode === 404 || statusCode === 410) {
      const email = req.body?.to;
      if (email) removeByEmail(email);
      return res.status(404).json({ success: false, error: 'Subscription invalid, removed' });
    }
    res.status(statusCode).json({ success: false, error: error?.message || 'Failed to send notification' });
  }
};

export const sendTestNotification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const sub = getByEmail(email);
    if (!sub) {
      return res.status(404).json({ success: false, error: 'No subscription found' });
    }

    const payload = JSON.stringify({
      title: 'Test Notification',
      body: 'This is a test push notification from NKAY',
      url: '/business/dashboard',
      tag: `test-${Date.now()}`,
    });

    configureVapid();
    await webpush.sendNotification(sub, payload);
    res.status(200).json({ success: true, message: 'Test notification sent' });
  } catch (error) {
    console.error('Push test error:', error);
    const statusCode = error?.statusCode || 500;
    if (statusCode === 404 || statusCode === 410) {
      const email = req.body?.email;
      if (email) removeByEmail(email);
      return res.status(404).json({ success: false, error: 'Subscription invalid, removed' });
    }
    res.status(statusCode).json({ success: false, error: error?.message || 'Failed to send test notification' });
  }
};
