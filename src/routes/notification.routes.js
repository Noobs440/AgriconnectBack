const express = require('express');
const router = express.Router();
const { listNotifications, createNotification } = require('../controllers/notification.controller');

router.get('/', listNotifications);
router.post('/', createNotification);

module.exports = router;
