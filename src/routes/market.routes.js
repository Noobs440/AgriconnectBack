const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { getCurrentPrices, createLimitOrder, listLimitOrders } = require('../controllers/market.controller');

router.get('/prices', getCurrentPrices);
router.post('/orders-limit', authenticate, createLimitOrder);
router.get('/orders-limit', authenticate, listLimitOrders);

module.exports = router;