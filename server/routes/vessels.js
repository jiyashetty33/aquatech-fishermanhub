const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');

const router = express.Router();

router.get('/', authenticateToken, authorizeRole('FISHERMAN', 'PORT_OFFICIAL', 'ADMIN'), (req, res) => {
  const data = req.app.locals.data;
  return res.json(data.vessels);
});

router.put('/:id/status', authenticateToken, authorizeRole('FISHERMAN', 'PORT_OFFICIAL', 'ADMIN'), (req, res) => {
  const { id } = req.params;
  const { status, source = req.user.role === 'FISHERMAN' ? 'FISHERMAN' : 'OFFICIAL' } = req.body || {};
  const data = req.app.locals.data;
  const vessel = data.vessels.find((entry) => String(entry.id) === String(id));

  if (!vessel) {
    return res.status(404).json({ message: 'Vessel not found.' });
  }

  if (req.user.role === 'FISHERMAN') {
    const fisherman = data.fishermen.find((entry) => entry.userId === req.user.id);
    if (!fisherman || String(fisherman.vesselId) !== String(id)) {
      return res.status(403).json({ message: 'Forbidden: you can only update your assigned vessel.' });
    }
  }

  const previous = vessel.status;
  const nextStatus = status || previous;
  vessel.status = nextStatus;
  vessel.lastUpdated = new Date().toISOString();

  data.vesselStatusHistory = data.vesselStatusHistory || [];
  data.vesselStatusHistory.push({
    id: Date.now(),
    vesselId: vessel.id,
    oldStatus: previous,
    newStatus: nextStatus,
    updatedBy: req.user.id,
    timestamp: new Date().toISOString(),
    source
  });

  data.auditLogs.push({
    id: Date.now(),
    userId: req.user.id,
    role: req.user.role,
    action: 'updated vessel status',
    entity: 'vessels',
    entityId: vessel.id,
    timestamp: new Date().toISOString()
  });

  return res.json({ message: 'Vessel status updated.', vessel, history: data.vesselStatusHistory[data.vesselStatusHistory.length - 1] });
});

module.exports = router;
