const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');
const db = require('../db');

const router = express.Router();

function isPrivateDataAllowed(user) {
  return user && (user.role === 'FISHERMAN' || user.role === 'ADMIN');
}

function getFishermanForUser(data, userId) {
  return data.fishermen.find((entry) => entry.userId === userId);
}

function getAvailableCatches(data, fisherman) {
  if (!fisherman) return [];

  const caughtBySpecies = data.catches
    .filter((catchEntry) => catchEntry.vesselId === fisherman.vesselId)
    .reduce((totals, catchEntry) => {
      const species = String(catchEntry.fishSpecies).trim();
      totals[species] = (totals[species] || 0) + Number(catchEntry.quantity || 0);
      return totals;
    }, {});

  data.listings
    .filter((listing) => listing.fishermanId === fisherman.id && listing.status === 'ACTIVE')
    .forEach((listing) => {
      const species = String(listing.fishSpecies).trim();
      caughtBySpecies[species] = Math.max(0, (caughtBySpecies[species] || 0) - Number(listing.quantity || 0));
    });

  return Object.entries(caughtBySpecies)
    .filter(([, quantity]) => quantity > 0)
    .map(([fishSpecies, availableQuantity]) => ({ fishSpecies, availableQuantity }));
}

router.get('/dashboard', authenticateToken, authorizeRole('FISHERMAN', 'ADMIN', 'BUYER'), async (req, res) => {
  const data = req.app.locals.data;
  const fisherman = getFishermanForUser(data, req.user.id) || data.fishermen[0];

  if (process.env.DB_MODE !== 'memory' && req.user.role === 'FISHERMAN') {
    try {
      const [profiles] = await db.query(
        `SELECT f.id AS fishermanId, v.id AS id, v.id AS vesselId, v.name, v.status,
                v.registration_number AS registrationNumber, v.vessel_type AS vesselType
           FROM fishermen f
           JOIN vessels v ON v.id = f.vessel_id
          WHERE f.user_id = ?
          LIMIT 1`,
        [req.user.id]
      );
      const profile = profiles[0];
      if (!profile) return res.status(404).json({ message: 'Fisherman vessel profile not found.' });
      const [catches] = await db.query(
        `SELECT cr.id, cr.fish_species AS fishSpecies, cr.quantity, cr.unit, cr.quality,
                cr.catch_date AS catchDate, cr.catch_location AS catchLocation,
                cr.vessel_id AS vesselId, cr.fishing_trip_id AS fishingTripId
           FROM catch_records cr
          WHERE cr.vessel_id = ?
          ORDER BY cr.id DESC`,
        [profile.vesselId]
      );
      return res.json({
        fisherman: { id: profile.fishermanId, userId: req.user.id, vesselId: profile.vesselId },
        vessel: profile,
        trips: [],
        catches,
        availableCatches: [],
        listings: [],
        notifications: []
      });
    } catch (error) {
      console.error('Fisherman dashboard lookup failed:', error);
      return res.status(503).json({ message: 'Fisherman dashboard is temporarily unavailable.' });
    }
  }

  return res.json({
    fisherman,
    vessel: data.vessels.find((vessel) => vessel.id === fisherman.vesselId),
    trips: data.fishingTrips.filter((trip) => trip.fishermanId === fisherman.id),
    catches: data.catches.filter((catchEntry) => catchEntry.vesselId === fisherman.vesselId),
    availableCatches: getAvailableCatches(data, fisherman),
    listings: data.listings.filter((listing) => listing.fishermanId === fisherman.id),
    notifications: data.notifications.filter((notif) => notif.userId === req.user.id)
  });
});

router.get('/available-catches', authenticateToken, authorizeRole('FISHERMAN', 'ADMIN'), (req, res) => {
  const data = req.app.locals.data;
  const fisherman = getFishermanForUser(data, req.user.id);

  if (!fisherman) {
    return res.status(404).json({ message: 'Fisherman profile not found.' });
  }

  return res.json(getAvailableCatches(data, fisherman));
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
