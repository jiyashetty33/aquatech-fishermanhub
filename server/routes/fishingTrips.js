const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');

const router = express.Router();

router.get('/', authenticateToken, authorizeRole('FISHERMAN', 'PORT_OFFICIAL', 'ADMIN'), (req, res) => {
  return res.json(req.app.locals.data.fishingTrips);
});

router.post('/', authenticateToken, authorizeRole('FISHERMAN', 'ADMIN'), (req, res) => {
  const { vesselId, fishermanId, status = 'PLANNED' } = req.body || {};
  const trip = {
    id: Date.now(),
    vesselId,
    vesselName: 'Demo Vessel',
    fishermanId,
    departureTime: new Date().toISOString(),
    expectedReturn: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
    actualReturn: null,
    status
  };

  req.app.locals.data.fishingTrips.push(trip);
  return res.status(201).json(trip);
});

module.exports = router;
