const contracts = [];
const prisma = require('../config/prisma');

function listContracts(req, res) {
  return res.json({ contracts });
}

function getContractById(req, res) {
  const contract = contracts.find(item => item.id === req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contrat introuvable' });
  return res.json({ contract });
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

  const users = await prisma.user.findMany({
    where: { id: { in: [buyerId, sellerId] } },
    select: { id: true, fullName: true, email: true },
  });
  const buyer = users.find(user => user.id === buyerId);
  const seller = users.find(user => user.id === sellerId);
  if (!buyer || !seller) {
    return res.status(400).json({ message: 'L\'acheteur ou le vendeur sélectionné n\'existe plus dans le système.' });
  }

  const contract = {
    id: `contract-${Date.now()}`,
    title: title.trim(),
    buyerId: buyer.id,
    sellerId: seller.id,
    buyerName: buyer.fullName || buyer.email,
    sellerName: seller.fullName || seller.email,
    amount: amountNumber,
    currency: currency || 'XAF',
    status: 'PENDING',
    deliveryDate: deliveryDate || null,
    location: location?.trim() || null,
    blockchainHash: certified ? '0xlocal' : null,
    certified: Boolean(certified),
    image,
  };

  contracts.unshift(contract);
  return res.status(201).json({ contract });
}

function payContract(req, res) {
  const contract = contracts.find(item => item.id === req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contrat introuvable' });
  if (contract.status !== 'PENDING') return res.status(409).json({ message: 'Ce contrat ne peut plus être payé.' });
  contract.status = 'PAID';
  return res.json({ success: true, contract });
}

function confirmDelivery(req, res) {
  const contract = contracts.find(item => item.id === req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contrat introuvable' });
  if (contract.status !== 'PAID') return res.status(409).json({ message: 'Le contrat doit être payé avant de confirmer la livraison.' });
  contract.status = 'DELIVERED';
  return res.json({ success: true, contract });
}

function getContractStatus(req, res) {
  const contract = contracts.find(item => item.id === req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contrat introuvable' });
  return res.json({ status: contract.status });
}

module.exports = { listContracts, getContractById, createContract, payContract, confirmDelivery, getContractStatus };