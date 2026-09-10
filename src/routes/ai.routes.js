const express = require('express');
const router = express.Router();
const { getAiHealth, getYieldForecast, getPriceForecast, getRecommendations, askProjectAssistant } = require('../controllers/ai.controller');

router.get('/health', getAiHealth);
router.get('/yield-forecast', getYieldForecast);
router.get('/yield-forecast/:region', getYieldForecast);
router.get('/price-forecast', getPriceForecast);
router.get('/price-forecast/:productId', getPriceForecast);
router.get('/recommendations', getRecommendations);
router.get('/recommendations/:productId', getRecommendations);
router.post('/chat', askProjectAssistant);

module.exports = router;
