const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');

const router = express.Router();

router.get('/', authenticateToken, authorizeRole('FISHERMAN', 'BUYER', 'MARKET_OPERATOR', 'ADMIN'), (req, res) => {
  return res.json(req.app.locals.data.auctions);
});

router.post('/', authenticateToken, authorizeRole('FISHERMAN', 'ADMIN'), (req, res) => {
  const { fishSpecies, quantity, startingPrice, durationMinutes = 60 } = req.body || {};
  const data = req.app.locals.data;
  const fisherman = data.fishermen.find((entry) => entry.userId === req.user.id);
  const species = data.fishSpecies.find((entry) => entry.toLowerCase() === String(fishSpecies || '').trim().toLowerCase());
  const parsedQuantity = Number(quantity);
  const parsedPrice = Number(startingPrice);

  if (!species || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    return res.status(400).json({ message: 'Fish species, quantity and starting price are required.' });
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

  const auction = {
    id: Date.now(),
    listingId: Date.now() + 10,
    fishermanId: fisherData.id,
    fishSpecies: species,
    quantity: parsedQuantity,
    startingPrice: parsedPrice,
    currentBid: parsedPrice,
    currentBidderId: null,
    status: 'ACTIVE',
    durationMinutes,
    closesAt: new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
  };

  req.app.locals.data.auctions.push(auction);
  req.app.locals.data.listings.push({
    id: auction.listingId,
    fishermanId: fisherData.id,
    fishSpecies: species,
    quantity: parsedQuantity,
    availableQuantity: parsedQuantity,
    quality: 'A',
    price: parsedPrice,
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
