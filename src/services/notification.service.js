const prisma = require('../config/prisma');

async function notifyUser(userId, title, body, kind = 'general', targetId = null) {
  return prisma.notification.create({
    data: { userId, title, body, kind, targetId },
  });
}

async function notifyUsersOfNewProduct(product) {
  const users = await prisma.user.findMany({
    where: { id: { not: product.sellerId } },
    select: { id: true },
  });

  if (users.length === 0) return;

  await prisma.notification.createMany({
    data: users.map(({ id }) => ({
      userId: id,
      title: 'Nouvelle offre disponible',
      body: `${product.title} est maintenant disponible au prix de ${product.price}.`,
      kind: 'publication',
      targetId: product.id,
    })),
  });
}

async function notifySellersOfOrder(order, products) {
  const sellerIds = [...new Set(products.map(product => product.sellerId))];
  if (sellerIds.length === 0) return;

  await prisma.notification.createMany({
    data: sellerIds.map(userId => ({
      userId,
      title: 'Nouvelle commande reçue',
      body: `La commande ${order.id} contient une ou plusieurs de vos offres pour un montant total de ${order.totalAmount}.`,
      kind: 'order',
      targetId: order.id,
    })),
  });
}

module.exports = { notifyUser, notifyUsersOfNewProduct, notifySellersOfOrder };