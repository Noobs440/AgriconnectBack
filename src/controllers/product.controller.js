const prisma = require('../config/prisma');
const { isOwnerOrAdmin } = require('../utils/ownership.util');

async function createProduct(req, res) {
  try {
    const { title, description, price, category, quantity } = req.body;
    if (!title || price === undefined) return res.status(400).json({ error: 'Title et price requis' });
    if (typeof title !== 'string' || title.trim() === '') return res.status(400).json({ error: 'Title invalide' });

    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum <= 0) return res.status(400).json({ error: 'Price doit être un nombre positif' });

    const qty = quantity !== undefined ? parseInt(quantity, 10) : 0;
    if (quantity !== undefined && (isNaN(qty) || qty < 0)) return res.status(400).json({ error: 'Quantity doit être un entier >= 0' });

    const product = await prisma.product.create({
      data: {
        title: title.trim(),
        description: description || null,
        price: priceNum,
        category: category || null,
        quantity: qty,
        sellerId: req.user.id,
      },
    });

    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function listProducts(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;

    // Build dynamic filters
    const where = {};

    const { category, minPrice, maxPrice, search, sellerId, sortBy } = req.query;

    if (category) where.category = category;

    const priceFilter = {};
    const minP = minPrice !== undefined ? parseFloat(minPrice) : NaN;
    const maxP = maxPrice !== undefined ? parseFloat(maxPrice) : NaN;
    if (!isNaN(minP)) priceFilter.gte = minP;
    if (!isNaN(maxP)) priceFilter.lte = maxP;
    if (Object.keys(priceFilter).length) where.price = priceFilter;

    if (sellerId) where.sellerId = sellerId;

    if (search) {
      const q = String(search);
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Determine ordering
    let orderBy = { createdAt: 'desc' };
    if (sortBy === 'price_asc') orderBy = { price: 'asc' };
    else if (sortBy === 'price_desc') orderBy = { price: 'desc' };
    else orderBy = { createdAt: 'desc' };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { seller: { select: { id: true, email: true, fullName: true } } },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 0;

    res.json({ page, limit, total, totalPages, products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { seller: { select: { id: true, email: true, fullName: true } } },
    });

    if (!product) return res.status(404).json({ error: 'Produit introuvable' });

    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const payload = {};
    const allowed = ['title', 'description', 'price', 'category', 'quantity'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) payload[key] = req.body[key];
    }

    if (payload.title !== undefined && (typeof payload.title !== 'string' || payload.title.trim() === '')) {
      return res.status(400).json({ error: 'Title invalide' });
    }
    if (payload.price !== undefined) {
      const priceNum = Number(payload.price);
      if (isNaN(priceNum) || priceNum <= 0) return res.status(400).json({ error: 'Price doit être un nombre positif' });
      payload.price = priceNum;
    }
    if (payload.quantity !== undefined) {
      const qty = parseInt(payload.quantity, 10);
      if (isNaN(qty) || qty < 0) return res.status(400).json({ error: 'Quantity doit être un entier >= 0' });
      payload.quantity = qty;
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });

    if (!isOwnerOrAdmin(req.user, product.sellerId)) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à modifier ce produit' });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: payload,
      include: { seller: { select: { id: true, email: true, fullName: true } } },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });

    if (!isOwnerOrAdmin(req.user, product.sellerId)) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à supprimer ce produit' });
    }

    await prisma.product.delete({ where: { id } });

    res.json({ message: 'Produit supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = { createProduct, listProducts, getProductById, updateProduct, deleteProduct };