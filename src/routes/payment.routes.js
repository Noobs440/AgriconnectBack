const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { initiatePayment, webhookCallback } = require('../controllers/payment.controller');

router.post('/initiate', authenticate, initiatePayment);
router.post('/webhook/mtn', webhookCallback);
router.post('/webhook/orange', webhookCallback);

module.exports = router;