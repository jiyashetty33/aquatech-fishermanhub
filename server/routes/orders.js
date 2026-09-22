const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');

const router = express.Router();

router.get('/', authenticateToken, authorizeRole('BUYER', 'FISHERMAN', 'ADMIN'), (req, res) => {
  return res.json(req.app.locals.data.orders);
});

router.post('/', authenticateToken, authorizeRole('BUYER', 'ADMIN'), (req, res) => {
  const { fishermanId, totalAmount, fishSpecies, quantity } = req.body || {};
  const order = {
    id: Date.now(),
    buyerId: req.user.id,
    fishermanId: Number(fishermanId),
    totalAmount: Number(totalAmount || 0),
    status: 'PAID',
    createdAt: new Date().toISOString()
  };

  req.app.locals.data.orders.push(order);
  req.app.locals.data.transactions.push({
    id: Date.now() + 1,
    buyerId: req.user.id,
    fishermanId: Number(fishermanId),
    orderId: order.id,
    amount: Number(totalAmount || 0),
    type: 'SALE',
    status: 'PAID',
    createdAt: new Date().toISOString()
  });

  return res.status(201).json(order);
});

module.exports = router;
