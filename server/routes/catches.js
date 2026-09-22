const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');

const router = express.Router();

router.get('/', authenticateToken, authorizeRole('FISHERMAN', 'ADMIN'), (req, res) => {
  return res.json(req.app.locals.data.catches);
});

router.post('/', authenticateToken, authorizeRole('FISHERMAN', 'ADMIN'), (req, res) => {
  const { fishSpecies, quantity, unit = 'kg', quality = 'A', catchLocation = 'Mangaluru Coast', vesselId, fishingTripId } = req.body || {};

  if (!fishSpecies || !quantity || !vesselId) {
    return res.status(400).json({ message: 'fishSpecies, quantity and vesselId are required.' });
  }

  const catchEntry = {
    id: Date.now(),
    fishSpecies,
    quantity: Number(quantity),
    unit,
    quality,
    catchDate: new Date().toISOString(),
    catchLocation,
    vesselId: Number(vesselId),
    fishingTripId: fishingTripId ? Number(fishingTripId) : null
  };

  req.app.locals.data.catches.push(catchEntry);
  return res.status(201).json(catchEntry);
});

module.exports = router;
