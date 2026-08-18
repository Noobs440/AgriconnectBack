const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { listContracts, getContractById, createContract, payContract, confirmDelivery, getContractStatus } = require('../controllers/contract.controller');

router.get('/', listContracts);
router.post('/', authenticate, createContract);
router.get('/:id', getContractById);
router.post('/:id/pay', authenticate, payContract);
router.post('/:id/confirm-delivery', authenticate, confirmDelivery);
router.get('/:id/status', getContractStatus);

module.exports = router;
