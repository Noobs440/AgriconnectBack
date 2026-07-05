const prisma = require('../config/prisma');
const { broadcastPriceUpdate } = require('./websocket.service');

async function recalculatePrice(productId) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, price: true, quantity: true },
  });
  if (!product) return null;

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const demandCount = await prisma.limitOrder.count({
    where: {
      productId,
      status: 'PENDING',
      createdAt: { gte: since },
    },
  });

  const demandScore = Math.min(demandCount / 10, 1);
  const supplyScore = Math.min(product.quantity / 100, 1);
  const variation = (demandScore - supplyScore) * 0.15;
  const rawPrice = product.price * (1 + variation);
  const newPrice = Math.max(Number(rawPrice.toFixed(2)), 0.01);

  const updatedProduct = await prisma.product.update({
    where: { id: productId },
    data: { price: newPrice },
  });

  await prisma.priceHistory.create({
    data: {
      productId,
      price: newPrice,
      recordedAt: new Date(),
    },
  });

  broadcastPriceUpdate(productId, newPrice);

  return updatedProduct;
}

module.exports = { recalculatePrice };