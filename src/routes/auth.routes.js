const express = require('express');
const router = express.Router();
const { requestOtp, verifyOtpAndRegister, login, refreshToken, getProfile, updateProfile } = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtpAndRegister);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/me', authenticate, getProfile);
router.put('/me', authenticate, updateProfile);

module.exports = router;