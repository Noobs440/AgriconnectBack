const prisma = require('../config/prisma');

const userSelect = { id: true, fullName: true, email: true, role: true, profileImage: true };

function formatMessage(message, currentUserId) {
  return {
    id: message.id,
    from: message.senderId === currentUserId ? 'me' : message.sender?.fullName || message.sender?.email || 'Utilisateur',
    senderId: message.senderId,
    receiverId: message.receiverId,
    text: message.text,
    ts: message.createdAt,
  };
}

async function listConversations(req, res) {
  const messages = await prisma.directMessage.findMany({
    where: { OR: [{ senderId: req.user.id }, { receiverId: req.user.id }] },
    orderBy: { createdAt: 'desc' },
    include: { sender: { select: userSelect }, receiver: { select: userSelect } },
  });

  const conversations = new Map();
  for (const message of messages) {
    const otherUser = message.senderId === req.user.id ? message.receiver : message.sender;
    if (!conversations.has(otherUser.id)) {
      conversations.set(otherUser.id, {
        user: otherUser,
        lastMessage: formatMessage(message, req.user.id),
      });
    }
  }

  return res.json({ conversations: [...conversations.values()] });
}

async function listMessages(req, res) {
  const otherUserId = String(req.query.userId || '').trim();
  if (!otherUserId) return res.status(400).json({ error: 'userId requis' });

  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: req.user.id, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: req.user.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
    include: { sender: { select: userSelect } },
  });

  return res.json({ messages: messages.map(message => formatMessage(message, req.user.id)) });
}

async function sendMessage(req, res) {
  const receiverId = String(req.body?.receiverId || '').trim();
  const text = String(req.body?.text || '').trim();
  if (!receiverId || !text) return res.status(400).json({ error: 'receiverId et text requis' });
  if (receiverId === req.user.id) return res.status(400).json({ error: 'Vous ne pouvez pas vous écrire à vous-même' });

  const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: userSelect });
  if (!receiver) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const message = await prisma.directMessage.create({
    data: { senderId: req.user.id, receiverId, text: text.slice(0, 2000) },
    include: { sender: { select: userSelect } },
  });

  await prisma.notification.create({
    data: {
      userId: receiverId,
      title: 'Nouveau message',
      body: `${req.user.email || 'Un utilisateur'} vous a envoyé un message.`,
      kind: 'message',
      targetId: req.user.id,
    },
  });

  return res.status(201).json({ message: formatMessage(message, req.user.id) });
}

module.exports = { listConversations, listMessages, sendMessage };