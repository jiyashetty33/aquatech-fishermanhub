const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');

const router = express.Router();

router.get('/', authenticateToken, authorizeRole('FISHERMAN', 'BUYER', 'MARKET_OPERATOR', 'ADMIN'), (req, res) => {
  return res.json(req.app.locals.data.listings);
});

router.post('/', authenticateToken, authorizeRole('FISHERMAN', 'ADMIN'), (req, res) => {
  const { fishSpecies, quantity, quality = 'A', price, saleType = 'DIRECT_SALE' } = req.body || {};

  if (!fishSpecies || !quantity || !price) {
    return res.status(400).json({ message: 'fishSpecies, quantity and price are required.' });
  }

  const fisherData = req.app.locals.data.fishermen.find((entry) => entry.userId === req.user.id) || req.app.locals.data.fishermen[0];
  const listing = {
    id: Date.now(),
    fishermanId: fisherData.id,
    fishSpecies,
    quantity: Number(quantity),
    availableQuantity: Number(quantity),
    quality,
    price: Number(price),
    saleType,
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  req.app.locals.data.listings.push(listing);
  return res.status(201).json(listing);
});

module.exports = router;
