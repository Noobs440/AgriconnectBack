const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { listNotifications, createNotification, markNotificationRead } = require('../controllers/notification.controller');

router.get('/', authenticate, listNotifications);
router.post('/', authenticate, createNotification);
router.patch('/:id/read', authenticate, markNotificationRead);

module.exports = router;
