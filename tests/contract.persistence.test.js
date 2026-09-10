const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/config/prisma');
const { createContract, listContracts } = require('../src/controllers/contract.controller');

test('contract creation persists in the database and is listed after creation', async () => {
  const buyer = await prisma.user.create({
    data: {
      email: 'buyer.persistence@example.com',
      password: 'secret123',
      fullName: 'Buyer Persistence',
      role: 'BUYER_PARTICULIER',
      contact: '237600000001',
    },
  });

  const seller = await prisma.user.create({
    data: {
      email: 'seller.persistence@example.com',
      password: 'secret123',
      fullName: 'Seller Persistence',
      role: 'FARMER',
      contact: '237600000002',
    },
  });

  const req = {
    body: {
      title: 'Contrat de persistance',
      buyerId: buyer.id,
      sellerId: seller.id,
      buyerName: buyer.fullName,
      sellerName: seller.fullName,
      amount: 250000,
      currency: 'XAF',
      deliveryDate: '2026-12-15',
      location: 'Yaoundé',
      certified: true,
      image: 'data:image/png;base64,abc123',
    },
  };

  const createRes = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  await createContract(req, createRes);
  assert.equal(createRes.statusCode, 201);
  assert.ok(createRes.body?.contract?.id, 'contract should be created');

  const dbCount = await prisma.contract.count();
  assert.equal(dbCount, 1, 'contract should be stored in the database');

  const listRes = {
    body: null,
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  await listContracts({}, listRes);
  assert.equal(listRes.body.contracts.length, 1, 'new contract should be returned from the database');

  await prisma.contract.deleteMany();
  await prisma.user.deleteMany({ where: { id: { in: [buyer.id, seller.id] } } });
});
