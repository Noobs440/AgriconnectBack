const express = require('express');
const router = express.Router();
const { requestOtp, register, verifyOtpAndRegister, login, refreshToken, getProfile, listSellers, listUsers, updateProfile, logout, addRole, switchRole } = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.post('/request-otp', requestOtp);
router.post('/register', register);
router.post('/verify-otp', verifyOtpAndRegister);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.post('/add-role', authenticate, addRole);
router.post('/switch-role', authenticate, switchRole);
router.get('/me', authenticate, getProfile);
router.get('/sellers', authenticate, listSellers);
router.get('/users', authenticate, listUsers);
router.put('/me', authenticate, updateProfile);

module.exports = router;