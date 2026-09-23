const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');

const router = express.Router();

router.get('/', authenticateToken, authorizeRole('FISHERMAN', 'BUYER', 'MARKET_OPERATOR', 'ADMIN'), (req, res) => {
  return res.json(req.app.locals.data.listings);
});

router.post('/', authenticateToken, authorizeRole('FISHERMAN', 'ADMIN'), (req, res) => {
  const { fishSpecies, quantity, quality = 'A', price, saleType = 'DIRECT_SALE' } = req.body || {};
  const data = req.app.locals.data;
  const fisherman = data.fishermen.find((entry) => entry.userId === req.user.id);
  const species = data.fishSpecies.find((entry) => entry.toLowerCase() === String(fishSpecies || '').trim().toLowerCase());
  const parsedQuantity = Number(quantity);
  const parsedPrice = Number(price);

  if (!species || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    return res.status(400).json({ message: 'fishSpecies, quantity and price are required.' });
  }

  const fisherData = fisherman || data.fishermen[0];
  const caughtQuantity = data.catches
    .filter((catchEntry) => catchEntry.vesselId === fisherData.vesselId && catchEntry.fishSpecies.toLowerCase() === species.toLowerCase())
    .reduce((total, catchEntry) => total + Number(catchEntry.quantity || 0), 0);
  const listedQuantity = data.listings
    .filter((listing) => listing.fishermanId === fisherData.id && listing.status === 'ACTIVE' && listing.fishSpecies.toLowerCase() === species.toLowerCase())
    .reduce((total, listing) => total + Number(listing.quantity || 0), 0);
  const availableQuantity = Math.max(0, caughtQuantity - listedQuantity);

  if (req.user.role === 'FISHERMAN' && (!fisherman || parsedQuantity > availableQuantity)) {
    return res.status(400).json({ message: `You only have ${availableQuantity} kg of ${species} available.` });
  }

  const listing = {
    id: Date.now(),
    fishermanId: fisherData.id,
    fishSpecies: species,
    quantity: parsedQuantity,
    availableQuantity: parsedQuantity,
    quality,
    price: parsedPrice,
    saleType,
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  req.app.locals.data.listings.push(listing);
  return res.status(201).json(listing);
});

module.exports = router;
