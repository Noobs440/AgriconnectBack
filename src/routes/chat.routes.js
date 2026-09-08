const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { listConversations, listMessages, sendMessage } = require('../controllers/chat.controller');

router.get('/conversations', authenticate, listConversations);
router.get('/messages', authenticate, listMessages);
router.post('/messages', authenticate, sendMessage);

module.exports = router;
