const prisma = require('../config/prisma');

async function createOrder(req, res) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items doit être un tableau non vide' });
    }

    const validatedItems = [];
    for (const item of items) {
      if (!item || typeof item !== 'object') {
        return res.status(400).json({ error: 'Chaque item doit être un objet valide' });
      }

      const { productId, quantity } = item;
      if (!productId) return res.status(400).json({ error: 'productId requis pour chaque item' });

      const qty = Number(quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        return res.status(400).json({ error: 'quantity doit être un entier positif' });
      }

      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) return res.status(404).json({ error: `Produit introuvable : ${productId}` });
      if (product.quantity < qty) {
        return res.status(400).json({ error: `Stock insuffisant pour ${product.title}` });
      }

      validatedItems.push({ productId, quantity: qty, product });
    }

    const result = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsData = [];

      for (const entry of validatedItems) {
        const unitPrice = entry.product.price;
        totalAmount += unitPrice * entry.quantity;
        orderItemsData.push({
          productId: entry.productId,
          quantity: entry.quantity,
          unitPrice,
        });
      }

      const order = await tx.order.create({
        data: {
          buyerId: req.user.id,
          status: 'PENDING',
          totalAmount,
        },
      });

      await tx.orderItem.createMany({
        data: orderItemsData.map((item) => ({ ...item, orderId: order.id })),
      });

      for (const entry of validatedItems) {
        await tx.product.update({
          where: { id: entry.productId },
          data: { quantity: { decrement: entry.quantity } },
        });
      }

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          items: {
            include: {
              product: { select: { id: true, title: true, location: true } },
            },
          },
        },
      });
    });

    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function listMyOrders(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;
    const { status } = req.query;

    const where = { buyerId: req.user.id };
    if (status && ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(status)) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: { select: { id: true, title: true } },
          },
        },
      },
    });

    res.json({ page, limit, orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function getOrderDetail(req, res) {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
        payments: true,
      },
    });

    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    if (order.buyerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à voir cette commande' });
    }

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = { createOrder, listMyOrders, getOrderDetail };