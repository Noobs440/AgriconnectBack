const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { createOrder, listMyOrders, getOrderDetail } = require('../controllers/order.controller');

router.post('/', authenticate, createOrder);
router.get('/my', authenticate, listMyOrders);
router.get('/:id', authenticate, getOrderDetail);

module.exports = router;