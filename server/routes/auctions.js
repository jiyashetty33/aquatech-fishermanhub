const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');

const router = express.Router();

router.get('/', authenticateToken, authorizeRole('FISHERMAN', 'BUYER', 'MARKET_OPERATOR', 'ADMIN'), (req, res) => {
  return res.json(req.app.locals.data.auctions);
});

router.post('/', authenticateToken, authorizeRole('FISHERMAN', 'ADMIN'), (req, res) => {
  const { fishSpecies, quantity, startingPrice, durationMinutes = 60 } = req.body || {};
  const fisherData = req.app.locals.data.fishermen.find((entry) => entry.userId === req.user.id) || req.app.locals.data.fishermen[0];
  const requestedQuantity = Number(quantity);
  const caughtQuantity = req.app.locals.data.catches
    .filter((entry) => entry.vesselId === fisherData.vesselId && entry.fishSpecies.toLowerCase() === String(fishSpecies).toLowerCase())
    .reduce((total, entry) => total + Number(entry.quantity || 0), 0);
  const listedQuantity = req.app.locals.data.listings
    .filter((entry) => entry.fishermanId === fisherData.id && entry.fishSpecies.toLowerCase() === String(fishSpecies).toLowerCase() && entry.status === 'ACTIVE')
    .reduce((total, entry) => total + Number(entry.availableQuantity || entry.quantity || 0), 0);
  if (caughtQuantity > 0 && requestedQuantity > caughtQuantity - listedQuantity) {
    return res.status(400).json({ message: `Only ${Math.max(0, caughtQuantity - listedQuantity)} kg of ${fishSpecies} is available to auction.` });
  }

  const auction = {
    id: Date.now(),
    listingId: Date.now() + 10,
    fishermanId: fisherData.id,
    fishSpecies,
    quantity: requestedQuantity,
    startingPrice: Number(startingPrice),
    currentBid: Number(startingPrice),
    currentBidderId: null,
    status: 'ACTIVE',
    durationMinutes,
    closesAt: new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
  };

  req.app.locals.data.auctions.push(auction);
  req.app.locals.data.listings.push({
    id: auction.listingId,
    fishermanId: fisherData.id,
    fishSpecies,
    quantity: requestedQuantity,
    availableQuantity: requestedQuantity,
    quality: 'A',
    price: Number(startingPrice),
    saleType: 'AUCTION',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  });

  return res.status(201).json(auction);
});

router.post('/:id/bid', authenticateToken, authorizeRole('BUYER', 'ADMIN'), (req, res) => {
  const { id } = req.params;
  const { amount } = req.body || {};
  const auction = req.app.locals.data.auctions.find((entry) => String(entry.id) === String(id));

  if (!auction) {
    return res.status(404).json({ message: 'Auction not found.' });
  }

  if (auction.status !== 'ACTIVE') {
    return res.status(400).json({ message: 'Auction is closed.' });
  }

  const parsedAmount = Number(amount);
  if (Number.isNaN(parsedAmount) || parsedAmount <= auction.currentBid) {
    return res.status(400).json({ message: 'Bid must be greater than current bid.' });
  }

  const buyer = req.app.locals.data.users.find((entry) => entry.id === req.user.id);
  const buyerProfile = req.app.locals.data.buyers ? req.app.locals.data.buyers.find((entry) => entry.userId === req.user.id) : { id: 1 };

  auction.currentBid = parsedAmount;
  auction.currentBidderId = buyerProfile ? buyerProfile.id : 1;
  req.app.locals.data.bids.push({
    id: Date.now(),
    auctionId: auction.id,
    buyerId: auction.currentBidderId,
    amount: parsedAmount,
    status: 'ACTIVE'
  });

  return res.json({ message: 'Bid placed successfully.', auction });
});

module.exports = router;
