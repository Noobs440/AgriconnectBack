const express = require('express');
const router = express.Router();
const { createTraceabilityEntry, getTraceabilityByQrCode, getTraceabilityHistoryByProduct } = require('../controllers/traceability.controller');

router.post('/', createTraceabilityEntry);
router.get('/product/:productId', getTraceabilityHistoryByProduct);
router.get('/:qrCode', getTraceabilityByQrCode);

module.exports = router;
