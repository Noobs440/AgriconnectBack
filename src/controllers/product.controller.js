const prisma = require('../config/prisma');
const { isOwnerOrAdmin } = require('../utils/ownership.util');

function shouldUseDatabaseError(err) {
  return Boolean(
    err && (
      err.code === 'P1001' ||
      err.code === 'P2021' ||
      err.code === 'P1017' ||
      err.message?.includes('DATABASE_URL') ||
      err.message?.includes('database') ||
      err.message?.includes('connect')
    )
  );
}

function serializeProduct(product) {
  return {
    id: product.id,
    title: product.title,
    description: product.description || '',
    price: Number(product.price),
    category: product.category || null,
    quantity: Number(product.quantity ?? product.stock ?? 0),
    stock: Number(product.quantity ?? product.stock ?? 0),
    sellerId: product.sellerId,
    unit: product.unit || 'kg',
    location: product.location || 'Dschang',
    quality: product.quality || 'Standard',
    deliveryTime: product.deliveryTime || '24h',
    images: Array.isArray(product.images) ? product.images : [],
    location: product.location || null,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    seller: product.seller ? { id: product.seller.id, email: product.seller.email, fullName: product.seller.fullName } : undefined,
  };
}

async function createProduct(req, res) {
  try {
    const { title, description, price, category, quantity, stock, unit, location, quality, deliveryTime, images } = req.body;
    if (!title || price === undefined) return res.status(400).json({ error: 'Title et price requis' });
    if (typeof title !== 'string' || title.trim() === '') return res.status(400).json({ error: 'Title invalide' });

    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum <= 0) return res.status(400).json({ error: 'Price doit être un nombre positif' });

    const qty = quantity !== undefined ? parseInt(quantity, 10) : (stock !== undefined ? parseInt(stock, 10) : 0);
    if (quantity !== undefined && (Number.isNaN(qty) || qty < 0)) return res.status(400).json({ error: 'Quantity doit être un entier >= 0' });
    if (stock !== undefined && (Number.isNaN(qty) || qty < 0)) return res.status(400).json({ error: 'Stock doit être un entier >= 0' });

    const product = await prisma.product.create({
      data: {
        title: title.trim(),
        description: description || null,
        price: priceNum,
        category: category || null,
        quantity: qty,
        sellerId: req.user.id,
        location: location || null,
        images: Array.isArray(images) ? images.filter(image => typeof image === 'string' && image.startsWith('data:image/')).slice(0, 5) : [],
      },
      include: { seller: { select: { id: true, email: true, fullName: true } } },
    });

    return res.status(201).json({ product: serializeProduct({
      ...product,
      unit,
      location,
      quality,
      deliveryTime,
    }) });
  } catch (err) {
    if (shouldUseDatabaseError(err)) {
      return res.status(503).json({ error: 'Service produit indisponible' });
    }

    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function listProducts(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;

    const where = {};
    const { category, minPrice, maxPrice, search, sellerId, sortBy } = req.query;

    if (category) where.category = category;

    const priceFilter = {};
    const minP = minPrice !== undefined ? parseFloat(minPrice) : NaN;
    const maxP = maxPrice !== undefined ? parseFloat(maxPrice) : NaN;
    if (!Number.isNaN(minP)) priceFilter.gte = minP;
    if (!Number.isNaN(maxP)) priceFilter.lte = maxP;
    if (Object.keys(priceFilter).length) where.price = priceFilter;

    if (sellerId) where.sellerId = sellerId;

    if (search) {
      const q = String(search);
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    let orderBy = { createdAt: 'desc' };
    if (sortBy === 'price_asc') orderBy = { price: 'asc' };
    else if (sortBy === 'price_desc') orderBy = { price: 'desc' };

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
    const serializedProducts = products.map(product => serializeProduct({ ...product }));

    return res.json({ page, limit, total, totalPages, products: serializedProducts });
  } catch (err) {
    if (shouldUseDatabaseError(err)) {
      return res.status(503).json({ error: 'Service produit indisponible' });
    }

    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur' });
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

    return res.json(serializeProduct({ ...product }));
  } catch (err) {
    if (shouldUseDatabaseError(err)) {
      return res.status(503).json({ error: 'Service produit indisponible' });
    }

    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const payload = {};
    const allowed = ['title', 'description', 'price', 'category', 'quantity', 'images', 'location'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) payload[key] = req.body[key];
    }

    if (payload.title !== undefined && (typeof payload.title !== 'string' || payload.title.trim() === '')) {
      return res.status(400).json({ error: 'Title invalide' });
    }
    if (payload.price !== undefined) {
      const priceNum = Number(payload.price);
      if (Number.isNaN(priceNum) || priceNum <= 0) return res.status(400).json({ error: 'Price doit être un nombre positif' });
      payload.price = priceNum;
    }
    if (payload.quantity !== undefined) {
      const qty = parseInt(payload.quantity, 10);
      if (Number.isNaN(qty) || qty < 0) return res.status(400).json({ error: 'Quantity doit être un entier >= 0' });
      payload.quantity = qty;
    }
    if (payload.images !== undefined) {
      if (!Array.isArray(payload.images)) return res.status(400).json({ error: 'Images invalides' });
      payload.images = payload.images.filter(image => typeof image === 'string' && image.startsWith('data:image/')).slice(0, 5);
    }

    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) return res.status(404).json({ error: 'Produit introuvable' });

    if (!isOwnerOrAdmin(req.user, existingProduct.sellerId)) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à modifier ce produit' });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: payload,
      include: { seller: { select: { id: true, email: true, fullName: true } } },
    });

    return res.json({ product: serializeProduct({ ...updated }) });
  } catch (err) {
    if (shouldUseDatabaseError(err)) {
      return res.status(503).json({ error: 'Service produit indisponible' });
    }

    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) return res.status(404).json({ error: 'Produit introuvable' });

    if (!isOwnerOrAdmin(req.user, existingProduct.sellerId)) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à supprimer ce produit' });
    }

    await prisma.product.delete({ where: { id } });

    return res.json({ message: 'Produit supprimé' });
  } catch (err) {
    if (shouldUseDatabaseError(err)) {
      return res.status(503).json({ error: 'Service produit indisponible' });
    }

    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = { createProduct, listProducts, getProductById, updateProduct, deleteProduct };