const notifications = [];

function listNotifications(req, res) {
  return res.json({ notifications });
}

function createNotification(req, res) {
  const { title, body } = req.body || {};
  const notification = {
    id: `notif-${Date.now()}`,
    title: title || 'Notification',
    body: body || 'Nouvelle activité',
    read: false,
    createdAt: new Date().toISOString(),
  };
  notifications.unshift(notification);
  return res.status(201).json({ notification });
}

module.exports = { listNotifications, createNotification };