const prisma = require('../config/prisma');

function serializeContract(contract) {
  return {
    id: contract.id,
    title: contract.title,
    buyerId: contract.buyerId,
    sellerId: contract.sellerId,
    buyerName: contract.buyerName || contract.buyer?.fullName || contract.buyer?.email || '',
    sellerName: contract.sellerName || contract.seller?.fullName || contract.seller?.email || '',
    amount: Number(contract.amount),
    currency: contract.currency || 'XAF',
    status: contract.status,
    deliveryDate: contract.deliveryDate ? new Date(contract.deliveryDate).toISOString().slice(0, 10) : null,
    location: contract.location || null,
    blockchainHash: contract.blockchainHash || null,
    certified: Boolean(contract.certified),
    image: contract.image || null,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
  };
}

async function listContracts(req, res) {
  try {
    const contracts = await prisma.contract.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: { select: { id: true, fullName: true, email: true } },
        seller: { select: { id: true, fullName: true, email: true } },
      },
    });

    return res.json({ contracts: contracts.map(serializeContract) });
  } catch (error) {
    console.error('listContracts error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function getContractById(req, res) {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: {
        buyer: { select: { id: true, fullName: true, email: true } },
        seller: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!contract) return res.status(404).json({ error: 'Contrat introuvable' });
    return res.json({ contract: serializeContract(contract) });
  } catch (error) {
    console.error('getContractById error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function createContract(req, res) {
  const { title, buyerId, sellerId, buyerName, sellerName, amount, currency, deliveryDate, location, certified, image } = req.body || {};
  const amountNumber = Number(amount);
  if (!title?.trim() || !buyerId || !sellerId) {
    return res.status(400).json({ message: 'Le titre, l\'acheteur et le vendeur enregistrés sont requis.' });
  }
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    return res.status(400).json({ message: 'Le montant doit être un nombre positif.' });
  }
  if (deliveryDate && Number.isNaN(Date.parse(deliveryDate))) {
    return res.status(400).json({ message: 'La date de livraison est invalide.' });
  }
  if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
    return res.status(400).json({ message: 'Une image de couverture est obligatoire.' });
  }

  try {
    const users = await prisma.user.findMany({
      where: { id: { in: [buyerId, sellerId] } },
      select: { id: true, fullName: true, email: true },
    });
    const buyer = users.find(user => user.id === buyerId);
    const seller = users.find(user => user.id === sellerId);

    if (!buyer || !seller) {
      return res.status(400).json({ message: 'L\'acheteur ou le vendeur sélectionné n\'existe plus dans le système.' });
    }

    const contract = await prisma.contract.create({
      data: {
        title: title.trim(),
        buyerId: buyer.id,
        sellerId: seller.id,
        buyerName: buyer.fullName || buyer.email || buyerName || 'Acheteur',
        sellerName: seller.fullName || seller.email || sellerName || 'Vendeur',
        amount: amountNumber,
        currency: currency || 'XAF',
        status: 'PENDING',
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        location: location?.trim() || null,
        blockchainHash: certified ? '0xlocal' : null,
        certified: Boolean(certified),
        image,
      },
      include: {
        buyer: { select: { id: true, fullName: true, email: true } },
        seller: { select: { id: true, fullName: true, email: true } },
      },
    });

    return res.status(201).json({ contract: serializeContract(contract) });
  } catch (error) {
    console.error('createContract error:', error);
    if (error?.code === 'P2003' || error?.code === 'P2025') {
      return res.status(400).json({ message: 'L\'acheteur ou le vendeur sélectionné n\'existe plus dans le système.' });
    }
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function payContract(req, res) {
  try {
    const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!contract) return res.status(404).json({ error: 'Contrat introuvable' });
    if (contract.status !== 'PENDING') return res.status(409).json({ message: 'Ce contrat ne peut plus être payé.' });

    const updated = await prisma.contract.update({
      where: { id: req.params.id },
      data: { status: 'PAID' },
      include: {
        buyer: { select: { id: true, fullName: true, email: true } },
        seller: { select: { id: true, fullName: true, email: true } },
      },
    });

    return res.json({ success: true, contract: serializeContract(updated) });
  } catch (error) {
    console.error('payContract error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function confirmDelivery(req, res) {
  try {
    const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!contract) return res.status(404).json({ error: 'Contrat introuvable' });
    if (contract.status !== 'PAID') return res.status(409).json({ message: 'Le contrat doit être payé avant de confirmer la livraison.' });

    const updated = await prisma.contract.update({
      where: { id: req.params.id },
      data: { status: 'DELIVERED' },
      include: {
        buyer: { select: { id: true, fullName: true, email: true } },
        seller: { select: { id: true, fullName: true, email: true } },
      },
    });

    return res.json({ success: true, contract: serializeContract(updated) });
  } catch (error) {
    console.error('confirmDelivery error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function getContractStatus(req, res) {
  try {
    const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!contract) return res.status(404).json({ error: 'Contrat introuvable' });
    return res.json({ status: contract.status });
  } catch (error) {
    console.error('getContractStatus error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = { listContracts, getContractById, createContract, payContract, confirmDelivery, getContractStatus };