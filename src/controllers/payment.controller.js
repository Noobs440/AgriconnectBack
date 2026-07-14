const prisma = require('../config/prisma');
const { detectOperator } = require('../utils/operator.util');
const { initiateCollect } = require('../services/campay.service');

async function initiatePayment(req, res) {
  try {
    const { orderId, phoneNumber } = req.body;
    if (!orderId || !phoneNumber) {
      return res.status(400).json({ error: 'orderId et phoneNumber requis' });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    if (order.buyerId !== req.user.id) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à payer cette commande' });
    }
    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: 'Cette commande ne peut plus être payée' });
    }

    const operatorExpected = detectOperator(phoneNumber);
    if (operatorExpected === 'UNKNOWN') {
      return res.status(400).json({ error: 'Numéro de téléphone invalide ou opérateur non reconnu' });
    }

    const payment = await prisma.payment.create({
      data: {
        orderId,
        provider: operatorExpected === 'MTN' ? 'MTN_MOMO' : 'ORANGE_MONEY',
        status: 'PENDING',
        amount: order.totalAmount,
        phoneNumber,
      },
    });

    let campayResponse;
    try {
      campayResponse = await initiateCollect({
        amount: order.totalAmount,
        phoneNumber,
        description: `Paiement commande ${orderId}`,
        externalReference: payment.id,
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: { externalRefId: campayResponse?.reference || null },
      });
    } catch (err) {
      console.error('Erreur initiation paiement CamPay', err);
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      return res.status(502).json({ error: 'Échec de l\'initiation du paiement CamPay' });
    }

    return res.status(201).json({ payment, campayReference: campayResponse?.reference || null });
  } catch (err) {
    console.error('Erreur paiement', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

function normalizeOperator(operator) {
  if (!operator || typeof operator !== 'string') return 'UNKNOWN';
  const normalized = operator.trim().toUpperCase();
  if (normalized.includes('MTN')) return 'MTN';
  if (normalized.includes('ORANGE')) return 'ORANGE';
  return 'UNKNOWN';
}

async function webhookCallback(req, res) {
  try {
    const body = req.body || {};
    const reference = body.reference || body.ref || body.transaction_reference;
    const externalReference = body.external_reference || body.externalReference || body.externalReferenceId;
    const operator = normalizeOperator(body.operator || body.Operator || body.OPERATOR);
    const status = body.status || body.Status || body.STATUS;

    let payment = null;
    if (reference) {
      payment = await prisma.payment.findFirst({ where: { externalRefId: reference } });
    }
    if (!payment && externalReference) {
      payment = await prisma.payment.findFirst({ where: { externalRefId: externalReference } });
    }

    if (!payment) {
      console.warn('Webhook CamPay reçu pour payment introuvable', { reference, externalReference, body });
      return res.status(200).json({ received: true });
    }

    const operatorConfirmed = operator;
    const expectedProvider = payment.provider;
    if (expectedProvider && operatorConfirmed !== 'UNKNOWN') {
      const expectedOperator = expectedProvider === 'MTN_MOMO' ? 'MTN' : 'ORANGE';
      if (operatorConfirmed !== expectedOperator) {
        console.warn('Incohérence opérateur CamPay', {
          paymentId: payment.id,
          expected: expectedOperator,
          confirmed: operatorConfirmed,
        });
      }
    }

    const newStatus = status === 'SUCCESSFUL' ? 'SUCCESS' : 'FAILED';
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        rawCallback: body,
        status: newStatus,
      },
    });

    if (newStatus === 'SUCCESS') {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'PAID' },
      });
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Erreur webhook CamPay', err);
    return res.status(200).json({ received: true });
  }
}

module.exports = { initiatePayment, webhookCallback };