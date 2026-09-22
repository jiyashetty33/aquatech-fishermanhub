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
  const { status } = req.body || {};
  const data = req.app.locals.data;
  const vessel = data.vessels.find((entry) => String(entry.id) === String(id));

  if (!vessel) {
    return res.status(404).json({ message: 'Vessel not found.' });
  }

  const previous = vessel.status;
  vessel.status = status || previous;
  vessel.lastUpdated = new Date().toISOString();

  data.auditLogs.push({
    id: Date.now(),
    userId: req.user.id,
    role: req.user.role,
    action: 'updated vessel status',
    entity: 'vessels',
    entityId: vessel.id,
    timestamp: new Date().toISOString()
  });

  return res.json({ message: 'Vessel status updated.', vessel });
});

module.exports = router;
