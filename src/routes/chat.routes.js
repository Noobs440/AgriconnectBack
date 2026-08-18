const express = require('express');
const router = express.Router();

router.get('/messages', (req, res) => {
  return res.json({ messages: [
    { id: 'm1', from: 'system', text: 'Bienvenue sur le chat AgriConnect', ts: new Date().toISOString() },
  ] });
});

router.post('/messages', (req, res) => {
  const { text } = req.body || {};
  return res.status(201).json({ message: { id: `m-${Date.now()}`, from: 'user', text: text || '...', ts: new Date().toISOString() } });
});

module.exports = router;
