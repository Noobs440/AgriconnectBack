const prisma = require('../config/prisma');
const { recalculatePrice } = require('../services/pricing.service');
const { getExternalMarketPrices } = require('../services/externalMarket.service');

function shouldUseDatabaseError(err) {
  return Boolean(
    err && (
      err.code === 'P1000' ||
      err.code === 'P1001' ||
      err.code === 'P2021' ||
      err.code === 'P1017' ||
      err.message?.includes('DATABASE_URL') ||
      err.message?.includes('database') ||
      err.message?.includes('connect') ||
      err.message?.includes('AuthenticationFailed')
    )
  );
}

async function getCurrentPrices(req, res) {
  try {
    const { productId } = req.query;
    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, title: true, price: true, quantity: true, updatedAt: true },
      });
      if (!product) return res.status(404).json({ error: 'Produit introuvable' });
      return res.json(product);
    }

    try {
      const externalMarket = await getExternalMarketPrices();
      return res.json({
        prices: externalMarket.prices,
        meta: {
          source: 'external',
          fetchedAt: externalMarket.fetchedAt,
        },
      });
    } catch (externalError) {
      console.warn('Source externe du marché indisponible, utilisation du fallback local:', externalError.message);
    }

    return res.json({
      prices: [],
      meta: {
        source: 'external-unavailable',
        message: 'Aucune cotation externe disponible. Les données simulées locales ne sont pas affichées.',
      },
    });
  } catch (err) {
    if (shouldUseDatabaseError(err)) {
      return res.status(503).json({ error: 'Service de marché indisponible' });
    }

    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function getPriceHistory(req, res) {
  try {
    const { productId } = req.params;
    const { from, to } = req.query;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });

    const where = { productId };
    if (from) {
      const fromDate = new Date(from);
      if (!Number.isNaN(fromDate.getTime())) where.recordedAt = { ...where.recordedAt, gte: fromDate };
    }
    if (to) {
      const toDate = new Date(to);
      if (!Number.isNaN(toDate.getTime())) where.recordedAt = { ...where.recordedAt, lte: toDate };
    }

    const history = await prisma.priceHistory.findMany({
      where,
      orderBy: { recordedAt: 'asc' },
    });

    res.json(history);
  } catch (err) {
    if (shouldUseDatabaseError(err)) {
      return res.status(503).json({ error: 'Service de marché indisponible' });
    }

    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function createLimitOrder(req, res) {
  try {
    const { productId, targetPrice, quantity } = req.body;
    if (!productId || targetPrice === undefined || quantity === undefined) {
      return res.status(400).json({ error: 'productId, targetPrice et quantity requis' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });

    const priceNum = Number(targetPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({ error: 'targetPrice doit être un nombre positif' });
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'quantity doit être un entier positif' });
    }

    const order = await prisma.limitOrder.create({
      data: {
        productId,
        buyerId: req.user.id,
        targetPrice: priceNum,
        quantity: qty,
        status: 'PENDING',
      },
    });

    const updatedProduct = await recalculatePrice(productId);

    res.status(201).json({ order, updatedProduct });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function listLimitOrders(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;
    const { status } = req.query;

    const where = {};
    if (status && ['PENDING', 'FILLED', 'CANCELLED'].includes(status)) {
      where.status = status;
    }

    if (req.user.role !== 'ADMIN') {
      where.buyerId = req.user.id;
    }

    const orders = await prisma.limitOrder.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { id: true, title: true, price: true } } },
    });

    res.json({ page, limit, orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = { getCurrentPrices, getPriceHistory, createLimitOrder, listLimitOrders };