const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');
const db = require('../db');

const router = express.Router();
const validStatuses = new Set(['AT_HARBOR', 'DEPARTED', 'FISHING', 'RETURNING', 'ANCHORED', 'ARRIVED', 'DOCKED', 'INACTIVE']);

router.get('/', authenticateToken, authorizeRole('FISHERMAN', 'PORT_OFFICIAL', 'ADMIN'), async (req, res) => {
  if (process.env.DB_MODE !== 'memory') {
    try {
      const params = req.user.role === 'FISHERMAN' ? [req.user.id] : [];
      const ownerClause = req.user.role === 'FISHERMAN' ? 'WHERE u.id = ?' : '';
      const [rows] = await db.query(
        `SELECT v.id, v.name, v.registration_number AS registrationNumber,
                v.fisherman_id AS fishermanId, v.vessel_type AS vesselType,
                v.status, v.departure_time AS departureTime,
                v.expected_return AS expectedReturn, v.created_at AS createdAt
           FROM vessels v
           LEFT JOIN fishermen f ON f.id = v.fisherman_id
           LEFT JOIN users u ON u.id = f.user_id
           ${ownerClause}
          ORDER BY v.id`,
        params
      );
      return res.json(rows);
    } catch (error) {
      console.error('Vessel lookup failed:', error);
      return res.status(503).json({ message: 'Vessel data is temporarily unavailable.' });
    }
  }
  const data = req.app.locals.data;
  return res.json(data.vessels);
});

router.put('/:id/status', authenticateToken, authorizeRole('FISHERMAN', 'PORT_OFFICIAL', 'ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { status, source = req.user.role === 'FISHERMAN' ? 'FISHERMAN' : 'OFFICIAL' } = req.body || {};

  if (!validStatuses.has(status)) {
    return res.status(400).json({ message: 'Invalid vessel status.' });
  }

  if (process.env.DB_MODE !== 'memory') {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();
      const params = req.user.role === 'FISHERMAN' ? [id, req.user.id] : [id];
      const ownerClause = req.user.role === 'FISHERMAN' ? 'AND f.user_id = ?' : '';
      const [rows] = await connection.query(
        `SELECT v.id, v.name, v.status, v.fisherman_id AS fishermanId
           FROM vessels v
           LEFT JOIN fishermen f ON f.id = v.fisherman_id
          WHERE v.id = ? ${ownerClause}
          FOR UPDATE`,
        params
      );
      const vessel = rows[0];
      if (!vessel) {
        await connection.rollback();
        return res.status(req.user.role === 'FISHERMAN' ? 403 : 404).json({ message: 'Vessel not found or not assigned to you.' });
      }

      await connection.query('UPDATE vessels SET status = ? WHERE id = ?', [status, id]);
      const [history] = await connection.query(
        `INSERT INTO vessel_status_history (vessel_id, old_status, new_status, updated_by, source)
         VALUES (?, ?, ?, ?, ?)`,
        [id, vessel.status, status, req.user.id, source]
      );
      await connection.query(
        `INSERT INTO audit_logs (user_id, role, action, entity, entity_id)
         VALUES (?, ?, ?, ?, ?)`,
        [req.user.id, req.user.role, 'updated vessel status', 'vessels', id]
      );
      await connection.commit();
      return res.json({
        message: 'Vessel status updated.',
        vessel: { ...vessel, status },
        history: { id: history.insertId, vesselId: Number(id), oldStatus: vessel.status, newStatus: status, updatedBy: req.user.id, source }
      });
    } catch (error) {
      if (connection) await connection.rollback();
      console.error('Vessel status update failed:', error);
      return res.status(503).json({ message: 'Vessel status could not be saved.' });
    } finally {
      if (connection) connection.release();
    }
  }

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
