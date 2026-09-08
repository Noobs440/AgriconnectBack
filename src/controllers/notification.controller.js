const prisma = require('../config/prisma');

async function listNotifications(req, res) {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return res.json({ notifications });
}

async function createNotification(req, res) {
  const { title, body, kind, targetId } = req.body || {};
  const notification = await prisma.notification.create({
    data: {
      userId: req.user.id,
      title: title || 'Notification',
      body: body || 'Nouvelle activité',
      kind: kind || 'general',
      targetId: targetId || null,
    },
  });
  return res.status(201).json({ notification });
}

async function markNotificationRead(req, res) {
  const notification = await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user.id },
    data: { read: Boolean(req.body?.read ?? true) },
  });

  if (notification.count === 0) return res.status(404).json({ error: 'Notification introuvable' });
  return res.json({ success: true });
}

module.exports = { listNotifications, createNotification, markNotificationRead };