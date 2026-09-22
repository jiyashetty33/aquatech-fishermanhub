const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');

const router = express.Router();

function isPrivateDataAllowed(user) {
  return user && (user.role === 'FISHERMAN' || user.role === 'ADMIN');
}

router.get('/dashboard', authenticateToken, authorizeRole('FISHERMAN', 'ADMIN', 'BUYER'), (req, res) => {
  const data = req.app.locals.data;
  const fisherman = data.fishermen.find((entry) => entry.userId === req.user.id) || data.fishermen[0];

  return res.json({
    fisherman,
    vessel: data.vessels.find((vessel) => vessel.id === fisherman.vesselId),
    trips: data.fishingTrips.filter((trip) => trip.fishermanId === fisherman.id),
    catches: data.catches.filter((catchEntry) => catchEntry.vesselId === fisherman.vesselId),
    listings: data.listings.filter((listing) => listing.fishermanId === fisherman.id),
    notifications: data.notifications.filter((notif) => notif.userId === req.user.id)
  });
});

router.get('/earnings', authenticateToken, (req, res) => {
  if (!isPrivateDataAllowed(req.user)) {
    return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
  }

  const data = req.app.locals.data;
  const fisherman = data.fishermen.find((entry) => entry.userId === req.user.id) || data.fishermen[0];
  const totalSales = data.orders.filter((order) => order.fishermanId === fisherman.id).reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

  return res.json({
    totalSales,
    totalEarnings: totalSales,
    completedTransactions: data.orders.filter((order) => order.fishermanId === fisherman.id && order.status === 'PAID').length,
    orders: data.orders.filter((order) => order.fishermanId === fisherman.id)
  });
});

router.get('/orders', authenticateToken, (req, res) => {
  if (!isPrivateDataAllowed(req.user)) {
    return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
  }

  const data = req.app.locals.data;
  const fisherman = data.fishermen.find((entry) => entry.userId === req.user.id) || data.fishermen[0];

  return res.json({
    items: data.orders.filter((order) => order.fishermanId === fisherman.id)
  });
});

router.get('/sales', authenticateToken, (req, res) => {
  if (!isPrivateDataAllowed(req.user)) {
    return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
  }

  const data = req.app.locals.data;
  const fisherman = data.fishermen.find((entry) => entry.userId === req.user.id) || data.fishermen[0];

  return res.json({
    sales: data.orders.filter((order) => order.fishermanId === fisherman.id)
  });
});

module.exports = router;
