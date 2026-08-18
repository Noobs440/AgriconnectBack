const express = require('express');
const router = express.Router();
const { getFarmerAnalytics, getBuyerAnalytics, getAdminAnalytics } = require('../controllers/analytics.controller');

router.get('/farmer', getFarmerAnalytics);
router.get('/buyer', getBuyerAnalytics);
router.get('/admin', getAdminAnalytics);

module.exports = router;
