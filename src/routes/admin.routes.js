const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/users', authenticate, authorize('ADMIN'), (req, res) => {
  return res.json({ users: [
    { id: 'u1', name: 'Alice', email: 'alice@example.com', role: 'ADMIN', active: true },
    { id: 'u2', name: 'Bob', email: 'bob@example.com', role: 'FARMER', active: true },
  ] });
});

router.put('/users/:id', authenticate, authorize('ADMIN'), (req, res) => {
  return res.json({ ok: true, user: { id: req.params.id, ...req.body } });
});

router.put('/products/moderate', authenticate, authorize('ADMIN'), (req, res) => {
  return res.json({ ok: true, action: req.body?.action || 'approve' });
});

module.exports = router;
