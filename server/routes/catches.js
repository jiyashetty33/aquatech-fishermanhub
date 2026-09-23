const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');
const db = require('../db');

const router = express.Router();

function useDatabase() {
  return process.env.DB_MODE !== 'memory';
}

router.get('/', authenticateToken, authorizeRole('FISHERMAN', 'ADMIN'), async (req, res) => {
  if (!useDatabase()) return res.json(req.app.locals.data.catches);

  try {
    const params = req.user.role === 'FISHERMAN' ? [req.user.id] : [];
    const ownerClause = req.user.role === 'FISHERMAN' ? 'WHERE f.user_id = ?' : '';
    const [rows] = await db.query(
      `SELECT cr.id, cr.fish_species AS fishSpecies, cr.quantity, cr.unit, cr.quality,
              cr.catch_date AS catchDate, cr.catch_location AS catchLocation,
              cr.vessel_id AS vesselId, cr.fishing_trip_id AS fishingTripId
         FROM catch_records cr
         JOIN vessels v ON v.id = cr.vessel_id
         JOIN fishermen f ON f.id = v.fisherman_id
         ${ownerClause}
        ORDER BY cr.id DESC`,
      params
    );
    return res.json(rows);
  } catch (error) {
    console.error('Catch lookup failed:', error);
    return res.status(503).json({ message: 'Catch records are temporarily unavailable.' });
  }
});

router.post('/', authenticateToken, authorizeRole('FISHERMAN', 'ADMIN'), async (req, res) => {
  const { fishSpecies, quantity, unit = 'kg', quality = 'A', catchLocation = 'Mangaluru Coast', vesselId, fishingTripId } = req.body || {};
  const data = req.app.locals.data;
  const parsedQuantity = Number(quantity);

  if (!fishSpecies || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
    return res.status(400).json({ message: 'fishSpecies, quantity and vesselId are required.' });
  }

  if (useDatabase()) {
    try {
      const [profiles] = await db.query(
        `SELECT f.id AS fishermanId, v.id AS vesselId
           FROM fishermen f
           JOIN vessels v ON v.id = f.vessel_id
          WHERE f.user_id = ?
          LIMIT 1`,
        [req.user.id]
      );
      const profile = profiles[0];
      if (req.user.role === 'FISHERMAN' && !profile) return res.status(404).json({ message: 'Fisherman vessel profile not found.' });

      const assignedVesselId = req.user.role === 'FISHERMAN' ? profile.vesselId : Number(vesselId);
      if (!assignedVesselId) return res.status(400).json({ message: 'An assigned vessel is required.' });
      if (req.user.role === 'FISHERMAN' && vesselId && String(vesselId) !== String(assignedVesselId)) {
        return res.status(403).json({ message: 'You can only record catch for your assigned vessel.' });
      }

      const [speciesRows] = await db.query(
        'SELECT name FROM fish_species WHERE LOWER(name) = LOWER(?) LIMIT 1',
        [String(fishSpecies).trim()]
      );
      const species = speciesRows[0]?.name;
      if (!species) return res.status(400).json({ message: 'Please select a valid fish species.' });

      let tripId = fishingTripId || null;
      if (tripId && req.user.role === 'FISHERMAN') {
        const [trips] = await db.query(
          'SELECT id FROM fishing_trips WHERE id = ? AND fisherman_id = ? AND vessel_id = ? LIMIT 1',
          [tripId, profile.fishermanId, assignedVesselId]
        );
        if (!trips.length) return res.status(403).json({ message: 'That fishing trip does not belong to your vessel.' });
      }

      const [result] = await db.query(
        `INSERT INTO catch_records
          (fish_species, quantity, unit, quality, catch_date, catch_location, vessel_id, fishing_trip_id)
         VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)`,
        [species, parsedQuantity, unit, quality, catchLocation, assignedVesselId, tripId]
      );
      const [createdRows] = await db.query(
        `SELECT id, fish_species AS fishSpecies, quantity, unit, quality,
                catch_date AS catchDate, catch_location AS catchLocation,
                vessel_id AS vesselId, fishing_trip_id AS fishingTripId
           FROM catch_records WHERE id = ?`,
        [result.insertId]
      );
      return res.status(201).json(createdRows[0]);
    } catch (error) {
      console.error('Catch insert failed:', error);
      return res.status(503).json({ message: 'The catch could not be saved. Please try again.' });
    }
  }

  const fisherman = data.fishermen.find((entry) => entry.userId === req.user.id);
  const species = data.fishSpecies.find((entry) => entry.toLowerCase() === String(fishSpecies || '').trim().toLowerCase());

  if (!species || !vesselId) {
    return res.status(400).json({ message: 'fishSpecies, quantity and vesselId are required.' });
  }

  if (req.user.role === 'FISHERMAN' && (!fisherman || String(fisherman.vesselId) !== String(vesselId))) {
    return res.status(403).json({ message: 'You can only record catch for your assigned vessel.' });
  }

  const catchEntry = {
    id: Date.now(),
    fishSpecies: species,
    quantity: parsedQuantity,
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
